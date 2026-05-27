// app/fleex/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, Heart, Share2, Bookmark, Volume2, VolumeX,
  RefreshCw, User, Music, MessageCircle,
  Plus, Flame, Sparkles, ChevronLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Video Categories for First-Time User
const VIDEO_CATEGORIES = [
  'For You',
  'Technology', 
  'Health & Wellness',
  'Entertainment',
  'Gaming',
  'Sports',
  'Business',
  'Music',
  'Lifestyle',
  'Fitness',
  'Comedy',
  'Education',
  'Travel',
  'Food',
  'Art',
  'Nature'
]

interface Fleex {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string
  caption: string
  music_name: string
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  duration: number
  created_at: string
  display_name?: string
  username?: string
  avatar_url?: string
}

export default function FleexPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [fleex, setFleex] = useState<Fleex[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedFleex, setSavedFleex] = useState<Set<string>>(new Set())
  const [likedFleex, setLikedFleex] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<any[]>([])
  
  // Category Selection State
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['For You'])
  const [tempCategories, setTempCategories] = useState<string[]>(['Technology', 'Music', 'Comedy'])
  const [hasSetInterests, setHasSetInterests] = useState(false)
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  // Fetch current user and check interests
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)
      
      // Check if user has selected categories before
      const { data: interests } = await supabase
        .from('user_interests')
        .select('categories')
        .eq('user_id', user.id)
        .single()
      
      if (interests && interests.categories && interests.categories.length > 0) {
        setSelectedCategories(interests.categories)
        setHasSetInterests(true)
        await fetchFleex(1, interests.categories)
      } else {
        setShowCategoryModal(true)
        setLoading(false)
      }
    }
    getUser()
  }, [supabase, router])

  // Fetch fleex based on categories (not just following)
  const fetchFleex = async (pageNum: number, categories: string[], refresh = false) => {
    if (refresh) setRefreshing(true)
    if (pageNum === 1) setLoading(true)
    
    try {
      if (!currentUser) return
      
      // Build search query from categories
      let searchQuery = ''
      if (categories.includes('For You')) {
        searchQuery = 'viral trending popular'
      } else {
        searchQuery = categories.join(' ')
      }
      
      // Fetch from your API endpoint that gets videos by category
      const response = await fetch(`/api/fleex/feed?page=${pageNum}&limit=${ITEMS_PER_PAGE}&q=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      const fleexData = data.fleex || []
      
      if (fleexData.length === 0 && pageNum === 1) {
        setFleex([])
        setHasMore(false)
        setLoading(false)
        return
      }
      
      // Get unique user IDs
      const uniqueUserIds = [...new Set(fleexData.map((f: any) => f.user_id))]
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', uniqueUserIds)
      
      const profileMap = new Map()
      profilesData?.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
      
      // Merge data
      const mergedFleex = fleexData.map((f: any) => ({
        ...f,
        display_name: profileMap.get(f.user_id)?.display_name || 'User',
        username: profileMap.get(f.user_id)?.username,
        avatar_url: profileMap.get(f.user_id)?.avatar_url
      }))
      
      if (pageNum === 1 || refresh) {
        setFleex(mergedFleex)
        setPage(1)
      } else {
        setFleex(prev => [...prev, ...mergedFleex])
      }
      
      setHasMore(mergedFleex.length === ITEMS_PER_PAGE)
      
      // Get user's likes and saves
      if (currentUser && mergedFleex.length) {
        const fleexIds = mergedFleex.map((f: any) => f.id)
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('fleex_likes').select('fleex_id').eq('user_id', currentUser.id).in('fleex_id', fleexIds),
          supabase.from('fleex_saves').select('fleex_id').eq('user_id', currentUser.id).in('fleex_id', fleexIds)
        ])
        
        setLikedFleex(new Set(likes?.map(l => l.fleex_id) || []))
        setSavedFleex(new Set(saves?.map(s => s.fleex_id) || []))
      }
    } catch (error) {
      console.error('Error fetching fleex:', error)
      // Fallback to mock data
      if (pageNum === 1) {
        setFleex(getMockFleex(categories))
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Save user interests
  const saveInterests = async () => {
    if (!currentUser) return
    
    await supabase
      .from('user_interests')
      .upsert({
        user_id: currentUser.id,
        categories: tempCategories,
        updated_at: new Date().toISOString()
      })
    
    setSelectedCategories(tempCategories)
    setHasSetInterests(true)
    setShowCategoryModal(false)
    await fetchFleex(1, tempCategories)
  }

  // Infinite scroll
  useEffect(() => {
    if (!hasSetInterests) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !refreshing) {
          const nextPage = page + 1
          setPage(nextPage)
          await fetchFleex(nextPage, selectedCategories)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    return () => observer.disconnect()
  }, [hasMore, loading, refreshing, page, hasSetInterests, selectedCategories])

  // Video scroll handling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollTop = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollTop / videoHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < fleex.length) {
      const prevVideo = videoRefs.current[currentIndex]
      if (prevVideo) prevVideo.pause()
      
      setCurrentIndex(newIndex)
      
      const newVideo = videoRefs.current[newIndex]
      if (newVideo) newVideo.play().catch(e => console.log('Play error:', e))
    }
  }, [currentIndex, fleex.length])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex]
    if (currentVideo) {
      currentVideo.play().catch(e => console.log('Auto-play error:', e))
    }
  }, [currentIndex])

  const toggleLike = async (fleexId: string) => {
    if (!currentUser) return
    
    const isLiked = likedFleex.has(fleexId)
    
    if (isLiked) {
      await supabase.from('fleex_likes').delete().eq('fleex_id', fleexId).eq('user_id', currentUser.id)
      setLikedFleex(prev => {
        const next = new Set(prev)
        next.delete(fleexId)
        return next
      })
      setFleex(prev => prev.map(f => 
        f.id === fleexId ? { ...f, like_count: f.like_count - 1 } : f
      ))
    } else {
      await supabase.from('fleex_likes').insert({ fleex_id: fleexId, user_id: currentUser.id })
      setLikedFleex(prev => new Set(prev).add(fleexId))
      setFleex(prev => prev.map(f => 
        f.id === fleexId ? { ...f, like_count: f.like_count + 1 } : f
      ))
    }
  }

  const toggleSave = async (fleexId: string) => {
    if (!currentUser) return
    
    const isSaved = savedFleex.has(fleexId)
    
    if (isSaved) {
      await supabase.from('fleex_saves').delete().eq('fleex_id', fleexId).eq('user_id', currentUser.id)
      setSavedFleex(prev => {
        const next = new Set(prev)
        next.delete(fleexId)
        return next
      })
    } else {
      await supabase.from('fleex_saves').insert({ fleex_id: fleexId, user_id: currentUser.id })
      setSavedFleex(prev => new Set(prev).add(fleexId))
    }
  }

  const addComment = async () => {
    if (!commentText.trim() || !currentUser) return
    
    const currentFleex = fleex[currentIndex]
    if (!currentFleex) return
    
    await supabase.from('fleex_comments').insert({
      fleex_id: currentFleex.id,
      user_id: currentUser.id,
      comment: commentText
    })
    
    setCommentText('')
    fetchComments(currentFleex.id)
    
    setFleex(prev => prev.map(f => 
      f.id === currentFleex.id ? { ...f, comment_count: f.comment_count + 1 } : f
    ))
  }

  const fetchComments = async (fleexId: string) => {
    const { data } = await supabase
      .from('fleex_comments')
      .select(`
        *,
        profiles:user_id (display_name, avatar_url)
      `)
      .eq('fleex_id', fleexId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    setComments(data || [])
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const handleVideoEnded = (index: number) => {
    const video = videoRefs.current[index]
    if (video) {
      video.currentTime = 0
      video.play().catch(e => console.log('Replay error:', e))
    }
  }

  const getMockFleex = (categories: string[]) => {
    const mockVideos = []
    const category = categories[0] || 'For You'
    for (let i = 0; i < 5; i++) {
      mockVideos.push({
        id: `mock_${i}`,
        user_id: currentUser?.id || 'mock',
        video_url: '',
        thumbnail_url: '',
        caption: `Sample ${category} video ${i + 1}`,
        music_name: 'Sample Sound',
        view_count: 1000,
        like_count: 100,
        comment_count: 10,
        share_count: 5,
        duration: 15,
        created_at: new Date().toISOString(),
        display_name: 'Sample Creator',
        username: 'creator',
        avatar_url: null
      })
    }
    return mockVideos
  }

  // Category Selection Modal (First Time User)
  if (showCategoryModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to Fleex! 🎬</h1>
            <p className="text-gray-500 text-sm">Select topics you're interested in</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6 max-h-64 overflow-y-auto">
            {VIDEO_CATEGORIES.map((category) => {
              const isSelected = tempCategories.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => {
                    if (isSelected) {
                      setTempCategories(prev => prev.filter(c => c !== category))
                    } else if (tempCategories.length < 6) {
                      setTempCategories(prev => [...prev, category])
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setTempCategories(VIDEO_CATEGORIES.slice(0, 6))}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-gray-600 text-sm"
            >
              Select Some
            </button>
            <button
              onClick={saveInterests}
              disabled={tempCategories.length === 0}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium text-sm disabled:opacity-50"
            >
              Continue ({tempCategories.length})
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && fleex.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading Fleex...</p>
        </div>
      </div>
    )
  }

  if (fleex.length === 0 && !loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Flame className="h-10 w-10 text-white/50" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">No Fleex yet</h2>
          <p className="text-white/50 text-sm mb-6">
            Check back later for new videos
          </p>
          <button
            onClick={() => fetchFleex(1, selectedCategories, true)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Simple Header - No bottom nav interference */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent pt-12 pb-4">
        <div className="flex items-center justify-center gap-1">
          <span className="text-white font-black text-xl">Face</span>
          <span className="text-orange-500 font-black text-xl">Forge</span>
          <span className="text-white font-black text-xl">Fleex</span>
        </div>
      </div>
      
      {/* Create Fleex Button - Positioned above bottom nav */}
      <Link href="/create-fleex">
        <button className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 shadow-lg flex items-center justify-center active:scale-95 transition">
          <Plus className="h-6 w-6 text-white" />
        </button>
      </Link>
      
      {/* Videos Container - Full height with proper padding */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {fleex.map((item, index) => (
          <div 
            key={item.id}
            className="relative h-screen w-full snap-start snap-always bg-black"
          >
            {/* Video Player */}
            {item.video_url ? (
              <video
                ref={el => { videoRefs.current[index] = el }}
                src={item.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                loop={false}
                muted={isMuted}
                playsInline
                poster={item.thumbnail_url}
                onEnded={() => handleVideoEnded(index)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <p className="text-white/50">Video unavailable</p>
              </div>
            )}
            
            {/* Right Side Actions */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
              <button
                onClick={() => toggleLike(item.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Heart className={`h-6 w-6 ${likedFleex.has(item.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs font-medium">{formatNumber(item.like_count)}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowComments(true)
                  fetchComments(item.id)
                }}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{formatNumber(item.comment_count)}</span>
              </button>
              
              <button
                onClick={() => toggleSave(item.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Bookmark className={`h-6 w-6 ${savedFleex.has(item.id) ? 'fill-blue-500 text-blue-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs font-medium">Save</span>
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                }}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Share</span>
              </button>
            </div>
            
            {/* Left Side Info */}
            <div className="absolute left-3 bottom-24 z-10 max-w-[70%]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {item.avatar_url ? (
                      <Image
                        src={item.avatar_url}
                        alt={item.display_name || 'User'}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {item.display_name || 'User'}
                  </p>
                  <p className="text-white/50 text-xs">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              {item.caption && (
                <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                  {item.caption}
                </p>
              )}
              
              <div className="flex items-center gap-1">
                <Music className="h-3.5 w-3.5 text-white/60" />
                <p className="text-white/60 text-xs">
                  {item.music_name || 'Original Sound'}
                </p>
              </div>
            </div>
            
            {/* Gradients */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
            
            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-20 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
            </button>
          </div>
        ))}
        
        {/* Loading indicator */}
        {hasMore && !loading && (
          <div ref={observerTarget} className="h-20 flex items-center justify-center bg-black">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-end" onClick={() => setShowComments(false)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-1">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">Be the first to comment</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {comment.profiles?.display_name || 'User'}
                      </p>
                      <p className="text-gray-600 text-sm">{comment.comment}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
                />
                <button
                  onClick={addComment}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
