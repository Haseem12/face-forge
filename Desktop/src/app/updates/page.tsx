// app/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, Clock, Eye, Heart, Share2, Play, Bookmark, Volume2, VolumeX,
  RefreshCw, Sparkles, Flame, TrendingUp, User, MoreHorizontal,
  Music, Instagram, Facebook, Twitter, Send, MessageCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Video Categories - Simple horizontal buttons without icons
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

// Category to search query mapping
const CATEGORY_QUERIES: Record<string, string> = {
  'For You': 'viral trending popular',
  'Technology': 'technology tech gadgets AI programming',
  'Health': 'health wellness mental health fitness',
  'Entertainment': 'entertainment movies tv shows viral',
  'Gaming': 'gaming video games gameplay esports',
  'Sports': 'sports highlights football basketball',
  'Business': 'business entrepreneurship finance',
  'Music': 'music new songs concerts',
  'Lifestyle': 'lifestyle vlog travel food',
  'Science': 'science physics space discovery',
  'Fitness': 'fitness workout gym exercise',
  'Creators': 'content creator tips youtube',
  'News': 'breaking news world news'
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
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [hasSetInterests, setHasSetInterests] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set())
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const observerTarget = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const categoriesScrollRef = useRef<HTMLDivElement>(null)
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

  // Check if user has set interests
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
        setShowInterestModal(true)
        setLoading(false)
      }
    } catch (error) {
      setShowInterestModal(true)
      setLoading(false)
    }
  }

  // Save user interests
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
      setShowInterestModal(false)
      await fetchVideos(1, categories[0], true)
    } catch (error) {
      console.error('Error saving interests:', error)
    }
  }

  // Fetch videos
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
        thumbnail: v.thumbnail || v.thumbnail_url || `https://picsum.photos/seed/${Date.now()}_${idx}/400/700`,
        channelTitle: v.channelTitle || v.channel_title || 'Creator',
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

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    fetchVideos(1, category, true)
  }

  // Handle video index change on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollTop = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollTop / videoHeight)
    
    if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
      // Pause previous video
      const prevVideo = videoRefs.current[currentVideoIndex]
      if (prevVideo) {
        prevVideo.pause()
      }
      
      setCurrentVideoIndex(newIndex)
      
      // Play new video
      const newVideo = videoRefs.current[newIndex]
      if (newVideo) {
        newVideo.play().catch(e => console.log('Playback error:', e))
      }
    }
    
    // Load more when reaching near bottom
    if (scrollTop + window.innerHeight * 3 >= containerRef.current.scrollHeight && hasMore && !loading && !refreshing) {
      setPage(prev => prev + 1)
      fetchVideos(page + 1, selectedCategory, false)
    }
  }, [currentVideoIndex, videos.length, hasMore, loading, refreshing, page, selectedCategory])

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Auto-play current video
  useEffect(() => {
    const currentVideo = videoRefs.current[currentVideoIndex]
    if (currentVideo) {
      currentVideo.play().catch(e => console.log('Auto-play error:', e))
    }
  }, [currentVideoIndex])

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    const currentVideo = videoRefs.current[currentVideoIndex]
    if (currentVideo) {
      currentVideo.muted = !isMuted
    }
  }

  // Format view count
  const formatViews = (views: string) => {
    const num = parseInt(views)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Toggle save video
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

  // Toggle like
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

  // Mock videos generator
  const getMockVideos = (category: string, count: number): Video[] => {
    const titles = [
      `Amazing ${category} video you need to see! 🔥`,
      `${category} experts share their secrets ✨`,
      `Best ${category} moments compilation 🎯`,
      `How to master ${category} in minutes ⚡`,
      `The future of ${category} is here 🚀`,
      `${category} tutorial for beginners 📚`,
      `Mind-blowing ${category} discoveries 💡`,
      `${category} challenge - can you do this? 🏆`
    ]
    
    const channels = [
      `${category} Insider`,
      `${category} Daily`,
      `The ${category} Show`,
      `${category} Masters`,
      `Learn ${category} Now`
    ]
    
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

  // Interest Selection Modal
  if (showInterestModal) {
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

  // Loading state
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
      {/* Category Header - Top */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent pt-5 pb-3">
        <div className="px-4">
          <div className="flex justify-center mb-3">
            <div className="flex gap-1">
              <span className="text-white font-black text-xl">Face</span>
              <span className="text-orange-500 font-black text-xl">Forge</span>
              <span className="text-white font-black text-xl">Reels</span>
            </div>
          </div>
          
          {/* Category Tabs - Horizontal Scroll */}
          <div 
            ref={categoriesScrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {VIDEO_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  selectedCategory === category
                    ? 'bg-white text-black'
                    : 'bg-white/20 text-white backdrop-blur-sm'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Refresh Indicator */}
      {showRefreshButton && (
        <button
          onClick={() => fetchVideos(1, selectedCategory, true)}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-bold shadow-lg animate-bounce"
        >
          <RefreshCw className="h-4 w-4" />
          {newVideosCount} new reels
        </button>
      )}
      
      {/* Videos Container - Full Screen Reels */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
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
                // Mock video - static image with gradient
                <div className="relative w-full h-full">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                </div>
              ) : (
                // Real YouTube embed (invisible, just audio/video)
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
            
            {/* Video Element for mock videos */}
            {video.videoId.startsWith('mock_') && (
              <video
                ref={el => { videoRefs.current[index] = el }}
                src={video.thumbnail}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                muted={isMuted}
                playsInline
                poster={video.thumbnail}
              />
            )}
            
            {/* Right Side Action Buttons */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
              {/* Like Button */}
              <button
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Heart className={`h-7 w-7 ${likedVideos.has(video.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs font-medium">{formatViews(video.likeCount)}</span>
              </button>
              
              {/* Comment Button */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Comment</span>
              </button>
              
              {/* Save Button */}
              <button
                onClick={() => toggleSave(video.id)}
                className="flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Bookmark className={`h-7 w-7 ${savedVideos.has(video.id) ? 'fill-blue-500 text-blue-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs font-medium">Save</span>
              </button>
              
              {/* Share Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://youtube.com/watch?v=${video.videoId}`)
                }}
                className="flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Share2 className="h-7 w-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Share</span>
              </button>
            </div>
            
            {/* Left Side - Info & Music */}
            <div className="absolute left-3 bottom-20 z-10 max-w-[70%]">
              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    {video.channelAvatar ? (
                      <Image
                        src={video.channelAvatar}
                        alt={video.channelTitle}
                        width={38}
                        height={38}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{video.channelTitle}</p>
                  <p className="text-white/60 text-xs">{formatViews(video.viewCount)} views</p>
                </div>
                <button className="px-4 py-1.5 bg-white rounded-full text-black text-xs font-bold">
                  Follow
                </button>
              </div>
              
              {/* Video Title */}
              <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                {video.title}
              </p>
              
              {/* Music Info */}
              <div className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5 text-white/80" />
                <p className="text-white/80 text-xs">Original Sound - {video.channelTitle}</p>
              </div>
            </div>
            
            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            
            {/* Top Gradient */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
            
            {/* Sound Toggle Button */}
            <button
              onClick={toggleMute}
              className="absolute top-24 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
            </button>
          </div>
        ))}
        
        {/* Loading indicator */}
        {hasMore && !loading && (
          <div className="h-20 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment</p>
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
