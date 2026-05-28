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
  Plus, Flame, Sparkles, ChevronLeft, Play, Pause,
  Verified, Crown, TrendingUp, Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const VIDEO_CATEGORIES = [
  'For You',
  'Trending',
  'Technology', 
  'Health',
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
  music_artist: string
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  duration: number
  created_at: string
  profiles?: {
    display_name: string
    username: string
    avatar_url: string
    is_official: boolean
    is_verified: boolean
  }
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
  const [selectedCategory, setSelectedCategory] = useState('For You')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [tempCategory, setTempCategory] = useState('For You')
  const [hasSetInterest, setHasSetInterest] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  // Check user interests on load
  useEffect(() => {
    const checkUserInterests = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)
      
      // Check if user has selected category before
      const { data: interests } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', user.id)
        .single()
      
      if (interests?.category) {
        setSelectedCategory(interests.category)
        setHasSetInterest(true)
        await fetchFleex(1, interests.category)
      } else {
        setShowCategoryModal(true)
        setLoading(false)
      }
    }
    checkUserInterests()
  }, [supabase, router])

  const fetchFleex = async (pageNum: number, category: string, refresh = false) => {
    if (refresh) setRefreshing(true)
    if (pageNum === 1) setLoading(true)
    if (pageNum > 1) setIsLoadingMore(true)
    
    try {
      // Get official accounts first
      const { data: officialAccounts } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_official', true)
      
      const officialIds = officialAccounts?.map(a => a.id) || []
      
      // Build query
      let query = supabase
        .from('user_fleex')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url,
            is_official,
            is_verified
          )
        `)
        .eq('is_private', false)
        .range((pageNum - 1) * ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE - 1)
      
      // Apply ordering
      if (category === 'Trending') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      
      // Apply category filter (search in caption)
      if (category !== 'For You' && category !== 'Trending') {
        query = query.ilike('caption', `%${category}%`)
      }
      
      const { data: videosData, error } = await query
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      if (!videosData || videosData.length === 0) {
        if (pageNum === 1) setFleex([])
        setHasMore(false)
        setLoading(false)
        setIsLoadingMore(false)
        return
      }
      
      // Transform data to include profile info directly
      const transformedVideos = videosData.map(video => ({
        ...video,
        display_name: video.profiles?.display_name,
        username: video.profiles?.username,
        avatar_url: video.profiles?.avatar_url,
        is_official: video.profiles?.is_official,
        is_verified: video.profiles?.is_verified
      }))
      
      // Sort: official content first, then by date
      const sortedVideos = transformedVideos.sort((a, b) => {
        const aIsOfficial = officialIds.includes(a.user_id)
        const bIsOfficial = officialIds.includes(b.user_id)
        if (aIsOfficial && !bIsOfficial) return -1
        if (!aIsOfficial && bIsOfficial) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      if (pageNum === 1 || refresh) {
        setFleex(sortedVideos)
        setPage(1)
        setCurrentIndex(0)
        // Reset scroll position
        if (containerRef.current && refresh) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else {
        setFleex(prev => [...prev, ...sortedVideos])
      }
      
      setHasMore(videosData.length === ITEMS_PER_PAGE)
      
      // Get user's likes and saves
      if (currentUser && sortedVideos.length) {
        const videoIds = sortedVideos.map(v => v.id)
        
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('fleex_likes').select('fleex_id').eq('user_id', currentUser.id).in('fleex_id', videoIds),
          supabase.from('fleex_saves').select('fleex_id').eq('user_id', currentUser.id).in('fleex_id', videoIds)
        ])
        
        setLikedFleex(new Set(likes?.map(l => l.fleex_id) || []))
        setSavedFleex(new Set(saves?.map(s => s.fleex_id) || []))
      }
    } catch (error) {
      console.error('Error fetching fleex:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsLoadingMore(false)
    }
  }

  const saveUserInterest = async () => {
    if (!currentUser) return
    
    await supabase
      .from('user_interests')
      .upsert({
        user_id: currentUser.id,
        category: tempCategory,
        updated_at: new Date().toISOString()
      })
    
    setSelectedCategory(tempCategory)
    setHasSetInterest(true)
    setShowCategoryModal(false)
    await fetchFleex(1, tempCategory)
  }

  // Infinite scroll
  useEffect(() => {
    if (!hasSetInterest) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !refreshing && !isLoadingMore && fleex.length > 0) {
          const nextPage = page + 1
          setPage(nextPage)
          await fetchFleex(nextPage, selectedCategory)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    return () => observer.disconnect()
  }, [hasMore, loading, refreshing, isLoadingMore, page, hasSetInterest, selectedCategory, fleex.length])

  // Video scroll handling with autoplay
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollTop = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollTop / videoHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < fleex.length) {
      // Pause previous video
      const prevVideo = videoRefs.current[currentIndex]
      if (prevVideo) prevVideo.pause()
      
      setCurrentIndex(newIndex)
    }
  }, [currentIndex, fleex.length])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Autoplay current video when it becomes visible
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex]
    if (currentVideo && currentVideo.readyState >= 2) {
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
        f.id === fleexId ? { ...f, like_count: Math.max(0, f.like_count - 1) } : f
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
      .limit(50)
    
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

  // Refresh feed
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchFleex(1, selectedCategory, true)
  }

  // Debug: Log official videos count
  useEffect(() => {
    if (fleex.length > 0) {
      const officialCount = fleex.filter(v => v.is_official).length
      console.log(`Total videos: ${fleex.length}, Official videos: ${officialCount}`)
    }
  }, [fleex])

  // Category Selection Modal
  if (showCategoryModal) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Choose Your Vibe</h1>
            <p className="text-gray-400 text-sm">Pick a category to start watching</p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mb-8 max-h-96 overflow-y-auto">
            {VIDEO_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setTempCategory(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  tempCategory === category
                    ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          
          <button
            onClick={saveUserInterest}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium active:scale-95 transition"
          >
            Start Watching
          </button>
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

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/60 to-transparent pt-12 pb-4">
        <div className="flex items-center justify-between px-4">
          {/* Category Selector */}
          <button
            onClick={() => {
              setTempCategory(selectedCategory)
              setShowCategoryModal(true)
            }}
            className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white text-xs font-medium active:scale-95 transition flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {selectedCategory}
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white/70 text-xs font-medium active:scale-95 transition flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Videos Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {fleex.length === 0 && !loading ? (
          <div className="h-screen flex flex-col items-center justify-center px-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Flame className="h-10 w-10 text-white/50" />
              </div>
              <h2 className="text-white font-bold text-xl mb-2">No videos found</h2>
              <p className="text-white/50 text-sm mb-6">
                Try a different category
              </p>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium"
              >
                Change Category
              </button>
            </div>
          </div>
        ) : (
          fleex.map((item, index) => (
            <div 
              key={item.id}
              className="relative h-screen w-full snap-start snap-always bg-black"
            >
              {/* Video Player */}
              <video
                ref={el => { videoRefs.current[index] = el }}
                src={item.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                loop={false}
                muted={isMuted}
                playsInline
                poster={item.thumbnail_url}
                onEnded={() => handleVideoEnded(index)}
                preload="metadata"
              />
              
              {/* Loading Overlay */}
              {index === currentIndex && videoRefs.current[currentIndex]?.readyState < 2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
                    const url = `${window.location.origin}/fleex/${item.id}`
                    navigator.clipboard.writeText(url)
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
              <div className="absolute left-3 bottom-28 z-10 max-w-[70%]">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-white font-semibold text-sm">
                        {item.display_name || 'Creator'}
                      </p>
                      {item.is_official && (
                        <div className="flex items-center">
                          <Crown className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                      {item.is_verified && !item.is_official && (
                        <Verified className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
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
                  <p className="text-white/60 text-xs truncate">
                    {item.music_name || 'Original Sound'}
                  </p>
                </div>
              </div>
              
              {/* Bottom Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
              
              {/* Sound Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-28 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 active:scale-95 transition"
              >
                {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
              </button>
              
              {/* Trending Badge for popular videos */}
              {item.view_count > 50000 && (
                <div className="absolute top-20 right-3 z-10">
                  <div className="px-2 py-1 rounded-full bg-red-500/80 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {hasMore && !loading && fleex.length > 0 && (
          <div ref={observerTarget} className="h-20 flex items-center justify-center bg-black">
            <div className="flex items-center gap-2 text-white/50">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowComments(false)}>
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowComments(false)} />
          <div 
            className="relative w-full bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">Be the first to comment</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <Image
                          src={comment.profiles.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
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
            
            <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <button
                  onClick={addComment}
                  disabled={!commentText.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium disabled:opacity-50 active:scale-95 transition"
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
