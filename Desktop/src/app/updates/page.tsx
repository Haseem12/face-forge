// app/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  X, Heart, Share2, Bookmark, Volume2, VolumeX,
  RefreshCw, Sparkles, User, Music, MessageCircle,
  ChevronLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Video Categories
const VIDEO_CATEGORIES = [
  'For You',
  'Technology', 
  'Health',
  'Entertainment',
  'Gaming',
  'Sports',
  'Business',
  'Music',
  'Lifestyle',
  'Science',
  'Fitness',
  'Creators',
  'News'
]

const CATEGORY_QUERIES: Record<string, string> = {
  'For You': 'viral trending popular',
  'Technology': 'technology tech gadgets AI',
  'Health': 'health wellness fitness',
  'Entertainment': 'entertainment movies viral',
  'Gaming': 'gaming gameplay esports',
  'Sports': 'sports highlights football',
  'Business': 'business entrepreneurship',
  'Music': 'music songs viral',
  'Lifestyle': 'lifestyle vlog travel',
  'Science': 'science space discovery',
  'Fitness': 'fitness workout gym',
  'Creators': 'content creator tips',
  'News': 'breaking news'
}

interface Video {
  id: string
  videoId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  channelId: string
  channelAvatar?: string
  viewCount: string
  likeCount: string
  duration: string
  publishedAt: string
  category: string
}

export default function UpdatesPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('For You')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [hasSetInterests, setHasSetInterests] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set())
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 8

  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        await checkUserInterests(user.id)
      } else {
        router.push('/auth/login')
      }
    }
    getUser()
  }, [supabase, router])

  const checkUserInterests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('categories')
        .eq('user_id', userId)
        .single()
      
      if (data && data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0])
        setHasSetInterests(true)
        fetchVideos(1, data.categories[0], true)
      } else {
        setShowCategoryModal(true)
        setLoading(false)
      }
    } catch (error) {
      setShowCategoryModal(true)
      setLoading(false)
    }
  }

  const saveInterests = async (categories: string[]) => {
    if (!currentUser || categories.length === 0) return
    
    try {
      const { error } = await supabase
        .from('user_interests')
        .upsert({
          user_id: currentUser.id,
          categories: categories,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      setSelectedCategory(categories[0])
      setHasSetInterests(true)
      setShowCategoryModal(false)
      await fetchVideos(1, categories[0], true)
    } catch (error) {
      console.error('Error saving interests:', error)
    }
  }

  const fetchVideos = async (pageNum: number, category: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else if (pageNum === 1) {
      setLoading(true)
    }
    
    try {
      const searchQuery = CATEGORY_QUERIES[category] || 'viral videos'
      const bustParam = isRefresh ? `&bust=${Date.now()}` : ''
      const res = await fetch(`/api/videos?page=${pageNum}&limit=${ITEMS_PER_PAGE}&q=${encodeURIComponent(searchQuery)}${bustParam}`)
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      const videosList: Video[] = (data.videos || []).map((v: any, idx: number) => ({
        id: v.id || v.videoId || `video_${Date.now()}_${idx}`,
        videoId: v.videoId || v.id,
        title: v.title || 'Untitled',
        description: v.description || '',
        thumbnail: v.thumbnail || `https://picsum.photos/seed/${Date.now()}_${idx}/400/700`,
        channelTitle: v.channelTitle || 'Creator',
        channelId: v.channelId || '',
        channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(v.channelTitle || 'Creator')}&background=random&color=fff&size=64`,
        viewCount: v.viewCount || Math.floor(Math.random() * 1000000).toString(),
        likeCount: v.likeCount || Math.floor(Math.random() * 50000).toString(),
        duration: v.duration || `PT${Math.floor(Math.random() * 60) + 15}S`,
        publishedAt: v.publishedAt || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: category
      }))
      
      if (isRefresh || pageNum === 1) {
        setVideos(videosList)
        setCurrentVideoIndex(0)
        setPage(1)
        setHasMore(videosList.length >= ITEMS_PER_PAGE)
        setLastUpdated(new Date())
        setShowRefreshButton(false)
      } else {
        setVideos(prev => [...prev, ...videosList])
        setHasMore(videosList.length >= ITEMS_PER_PAGE)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
      const mockVideos = getMockVideos(category, ITEMS_PER_PAGE)
      if (isRefresh || pageNum === 1) {
        setVideos(mockVideos)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollTop = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollTop / videoHeight)
    
    if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
      const prevVideo = videoRefs.current[currentVideoIndex]
      if (prevVideo) {
        prevVideo.pause()
      }
      
      setCurrentVideoIndex(newIndex)
      
      const newVideo = videoRefs.current[newIndex]
      if (newVideo) {
        newVideo.play().catch(e => console.log('Playback error:', e))
      }
    }
    
    if (scrollTop + window.innerHeight * 2 >= containerRef.current.scrollHeight && hasMore && !loading && !refreshing) {
      setPage(prev => prev + 1)
      fetchVideos(page + 1, selectedCategory, false)
    }
  }, [currentVideoIndex, videos.length, hasMore, loading, refreshing, page, selectedCategory])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    const currentVideo = videoRefs.current[currentVideoIndex]
    if (currentVideo) {
      currentVideo.play().catch(e => console.log('Auto-play error:', e))
    }
  }, [currentVideoIndex])

  const toggleMute = () => {
    setIsMuted(!isMuted)
    const currentVideo = videoRefs.current[currentVideoIndex]
    if (currentVideo) {
      currentVideo.muted = !isMuted
    }
  }

  const formatNumber = (num: string) => {
    const n = parseInt(num)
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const toggleSave = async (videoId: string) => {
    if (!currentUser) return
    
    const isSaved = savedVideos.has(videoId)
    if (isSaved) {
      await supabase.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', currentUser.id)
      setSavedVideos(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    } else {
      await supabase.from('saved_videos').insert({ video_id: videoId, user_id: currentUser.id })
      setSavedVideos(prev => new Set(prev).add(videoId))
    }
  }

  const toggleLike = async (videoId: string) => {
    if (!currentUser) return
    
    const isLiked = likedVideos.has(videoId)
    if (isLiked) {
      await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', currentUser.id)
      setLikedVideos(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    } else {
      await supabase.from('video_likes').insert({ video_id: videoId, user_id: currentUser.id })
      setLikedVideos(prev => new Set(prev).add(videoId))
    }
  }

  const handleVideoEnded = (index: number) => {
    const video = videoRefs.current[index]
    if (video) {
      video.currentTime = 0
      video.play().catch(e => console.log('Replay error:', e))
    }
  }

  const getMockVideos = (category: string, count: number): Video[] => {
    const titles = [
      `Amazing ${category} video! 🔥`,
      `${category} experts share secrets ✨`,
      `Best ${category} moments 🎯`,
      `How to master ${category} ⚡`,
      `The future of ${category} 🚀`,
      `${category} tutorial for beginners 📚`,
      `Mind-blowing ${category} discoveries 💡`
    ]
    
    const channels = [`${category} Insider`, `${category} Daily`, `The ${category} Show`]
    
    const videos = []
    for (let i = 0; i < count; i++) {
      videos.push({
        id: `mock_${Date.now()}_${i}`,
        videoId: `mock_${i}`,
        title: titles[i % titles.length],
        description: `Watch this amazing ${category} video`,
        thumbnail: `https://picsum.photos/seed/${category}_${i}/400/700`,
        channelTitle: channels[i % channels.length],
        channelId: `channel_${i}`,
        channelAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(channels[i % channels.length])}&background=random&color=fff&size=64`,
        viewCount: `${Math.floor(Math.random() * 5000000)}`,
        likeCount: `${Math.floor(Math.random() * 200000)}`,
        duration: `PT${Math.floor(Math.random() * 60) + 15}S`,
        publishedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        category: category
      })
    }
    return videos
  }

  // Category Selection Modal (First Time)
  if (showCategoryModal) {
    const [tempCategories, setTempCategories] = useState<string[]>(['Technology', 'Entertainment', 'Music'])
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to Reels! 🎬</h1>
            <p className="text-gray-500 text-sm">Select your interests to get personalized videos</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6 max-h-64 overflow-y-auto">
            {VIDEO_CATEGORIES.filter(c => c !== 'For You').map((category) => {
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
              onClick={() => setTempCategories(VIDEO_CATEGORIES.filter(c => c !== 'For You'))}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-gray-600 text-sm"
            >
              Select All
            </button>
            <button
              onClick={() => saveInterests(tempCategories)}
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

  // Category Selector Button (Top Right)
  const CategorySelector = () => (
    <button
      onClick={() => setShowCategorySelector(!showCategorySelector)}
      className="absolute top-12 right-3 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-95 transition"
    >
      <User className="h-5 w-5 text-white" />
    </button>
  )

  // Category List Modal
  const CategoryListModal = () => (
    <div className="fixed inset-0 z-30 bg-black/95 flex items-end" onClick={() => setShowCategorySelector(false)}>
      <div className="w-full bg-gradient-to-t from-black to-gray-900 rounded-t-2xl max-h-[60vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <h3 className="text-white font-bold text-lg">Select Category</h3>
          <button onClick={() => setShowCategorySelector(false)} className="p-1">
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIDEO_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setShowCategorySelector(false)
                fetchVideos(1, category, true)
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (loading && videos.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading reels...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Refresh Indicator */}
      {showRefreshButton && (
        <button
          onClick={() => fetchVideos(1, selectedCategory, true)}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-bold shadow-lg animate-bounce"
        >
          <RefreshCw className="h-4 w-4" />
          {newVideosCount} new reels
        </button>
      )}
      
      {/* Category Selector Button */}
      <CategorySelector />
      
      {/* Category List Modal */}
      {showCategorySelector && <CategoryListModal />}
      
      {/* Videos Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth pt-14"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, index) => (
          <div 
            key={video.id}
            className="relative h-screen w-full snap-start snap-always bg-black"
          >
            {/* Video Background */}
            <div className="absolute inset-0">
              {video.videoId.startsWith('mock_') ? (
                <video
                  ref={el => { videoRefs.current[index] = el }}
                  src={video.thumbnail}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop={false}
                  muted={isMuted}
                  playsInline
                  poster={video.thumbnail}
                  onEnded={() => handleVideoEnded(index)}
                />
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${video.videoId}?autoplay=${index === currentVideoIndex ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${video.videoId}&modestbranding=1&rel=0&showinfo=0&autohide=1&playsinline=1`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            
            {/* Right Side Action Buttons - Smaller */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-3 z-10">
              <button
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Heart className={`h-5 w-5 ${likedVideos.has(video.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-[10px] font-medium">{formatNumber(video.likeCount)}</span>
              </button>
              
              <button
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-medium">Comment</span>
              </button>
              
              <button
                onClick={() => toggleSave(video.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Bookmark className={`h-5 w-5 ${savedVideos.has(video.id) ? 'fill-blue-500 text-blue-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-[10px] font-medium">Save</span>
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://youtube.com/watch?v=${video.videoId}`)
                }}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-medium">Share</span>
              </button>
            </div>
            
            {/* Left Side - Info */}
            <div className="absolute left-3 bottom-24 z-10 max-w-[70%]">
              {/* Creator Info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    {video.channelAvatar ? (
                      <Image
                        src={video.channelAvatar}
                        alt={video.channelTitle}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-xs">{video.channelTitle}</p>
                  <p className="text-white/50 text-[10px]">{formatNumber(video.viewCount)} views</p>
                </div>
                <button className="px-3 py-1 bg-white rounded-full text-black text-[10px] font-bold">
                  Follow
                </button>
              </div>
              
              {/* Video Title */}
              <p className="text-white text-xs font-medium mb-1 line-clamp-2">
                {video.title}
              </p>
              
              {/* Music Info */}
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3 text-white/60" />
                <p className="text-white/60 text-[10px]">Original Sound - {video.channelTitle}</p>
              </div>
            </div>
            
            {/* Gradients */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
            
            {/* Sound Toggle */}
            <button
              onClick={toggleMute}
              className="absolute top-20 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>
          </div>
        ))}
        
        {/* Loading indicator */}
        {hasMore && !loading && (
          <div className="h-16 flex items-center justify-center bg-black">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Comments Modal */}
      {showComments && videos[currentVideoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-end" onClick={() => setShowComments(false)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-1">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Be the first to comment</p>
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium">
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
