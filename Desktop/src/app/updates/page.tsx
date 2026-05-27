// app/dashboard/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell, Sparkles, Users, TrendingUp, MessageCircle, Hash,
  Plus, Send, Image as ImageIcon, Smile, X, Clock,
  Eye, Heart, Share2, MoreVertical, Pin, Flame,
  Crown, Zap, Lock, Globe, ChevronRight, Repeat,
  Play, ThumbsUp, Bookmark, Volume2, VolumeX, Maximize,
  Film, Code, Heart as HeartIcon, Briefcase, Gamepad2,
  Trophy, Palette, Music, Coffee, Brain, Dumbbell
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import StoryViewer from '@/components/dashboard/stories/story-viewer'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import ThreeCurveFab from '@/components/dashboard/layout/three-curve-fab'

// Video Categories for Interest Selection
const VIDEO_CATEGORIES = [
  { id: 'technology', name: 'Technology', icon: Code, color: 'from-blue-500 to-cyan-500', emoji: '💻' },
  { id: 'health', name: 'Health & Wellness', icon: HeartIcon, color: 'from-green-500 to-emerald-500', emoji: '💪' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, color: 'from-pink-500 to-rose-500', emoji: '🎬' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: 'from-purple-500 to-indigo-500', emoji: '🎮' },
  { id: 'sports', name: 'Sports', icon: Trophy, color: 'from-yellow-500 to-orange-500', emoji: '⚽' },
  { id: 'business', name: 'Business', icon: Briefcase, color: 'from-slate-500 to-gray-500', emoji: '💼' },
  { id: 'music', name: 'Music', icon: Music, color: 'from-red-500 to-orange-500', emoji: '🎵' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Coffee, color: 'from-amber-500 to-yellow-500', emoji: '🌟' },
  { id: 'science', name: 'Science', icon: Brain, color: 'from-teal-500 to-cyan-500', emoji: '🔬' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, color: 'from-lime-500 to-green-500', emoji: '🏋️' },
  { id: 'creators', name: 'Creator Hub', icon: Palette, color: 'from-orange-500 to-purple-600', emoji: '🎨' },
  { id: 'news', name: 'News', icon: Globe, color: 'from-blue-600 to-indigo-600', emoji: '📰' },
]

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

interface UserInterests {
  id: string
  user_id: string
  categories: string[]
  created_at: string
  updated_at: string
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [hasSetInterests, setHasSetInterests] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set())
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 12

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
        setSelectedCategories(data.categories)
        setHasSetInterests(true)
        fetchVideos(1, data.categories, true)
      } else {
        setShowInterestModal(true)
        setLoading(false)
      }
    } catch (error) {
      // No interests found
      setShowInterestModal(true)
      setLoading(false)
    }
  }

  // Save user interests
  const saveInterests = async () => {
    if (!currentUser || selectedCategories.length === 0) return
    
    try {
      const { error } = await supabase
        .from('user_interests')
        .upsert({
          user_id: currentUser.id,
          categories: selectedCategories,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      setHasSetInterests(true)
      setShowInterestModal(false)
      await fetchVideos(1, selectedCategories, true)
    } catch (error) {
      console.error('Error saving interests:', error)
    }
  }

  // Fetch videos from YouTube API
  const fetchVideos = async (pageNum: number, categories: string[], isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else if (pageNum === 1) {
      setLoading(true)
    }
    
    try {
      const categoriesParam = categories.join(',')
      const bustParam = isRefresh ? `&bust=${Date.now()}` : ''
      const res = await fetch(`/api/videos?page=${pageNum}&limit=${ITEMS_PER_PAGE}&categories=${categoriesParam}${bustParam}`)
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      const videosList: Video[] = (data.videos || []).map((v: any) => ({
        id: v.id.videoId,
        videoId: v.id.videoId,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
        channelTitle: v.snippet.channelTitle,
        channelId: v.snippet.channelId,
        viewCount: v.statistics?.viewCount || '0',
        likeCount: v.statistics?.likeCount || '0',
        duration: v.contentDetails?.duration || 'PT0M0S',
        publishedAt: v.snippet.publishedAt,
        category: categories[Math.floor(Math.random() * categories.length)]
      }))
      
      if (isRefresh || pageNum === 1) {
        // Count new videos from last hour
        const now = new Date()
        const newCount = videosList.filter(v => {
          const pubDate = new Date(v.publishedAt)
          const diffMinutes = (now.getTime() - pubDate.getTime()) / 1000 / 60
          return diffMinutes < 60
        }).length
        
        setNewVideosCount(newCount)
        setVideos(videosList)
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
      // Fallback to mock data if API fails
      if (isRefresh || pageNum === 1) {
        setVideos(getMockVideos(categories))
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Background refresh check
  useEffect(() => {
    if (!hasSetInterests) return
    
    const interval = setInterval(async () => {
      if (document.hidden) return
      
      try {
        const res = await fetch(`/api/videos/check?since=${lastUpdated?.toISOString() || ''}&categories=${selectedCategories.join(',')}`)
        const data = await res.json()
        
        if (data.newCount > 0 && !showRefreshButton) {
          setNewVideosCount(data.newCount)
          setShowRefreshButton(true)
        }
      } catch (error) {
        console.error('Background check failed:', error)
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [hasSetInterests, selectedCategories, lastUpdated, showRefreshButton])

  // Handle manual refresh
  const handleRefresh = async () => {
    if (refreshing) return
    await fetchVideos(1, selectedCategories, true)
    
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    if (!hasSetInterests) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !refreshing) {
          const nextPage = page + 1
          setPage(nextPage)
          await fetchVideos(nextPage, selectedCategories, false)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    return () => observer.disconnect()
  }, [hasMore, loading, refreshing, page, hasSetInterests, selectedCategories])

  // Format view count
  const formatViews = (views: string) => {
    const num = parseInt(views)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Format duration (PT1H2M3S -> 1:02:03)
  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'
    const hours = match[1] ? parseInt(match[1]) : 0
    const minutes = match[2] ? parseInt(match[2]) : 0
    const seconds = match[3] ? parseInt(match[3]) : 0
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

  // Share video
  const shareVideo = (videoId: string) => {
    const url = `https://youtube.com/watch?v=${videoId}`
    navigator.clipboard.writeText(url)
  }

  // Get category icon and color
  const getCategoryStyle = (categoryId: string) => {
    const cat = VIDEO_CATEGORIES.find(c => c.id === categoryId)
    return {
      icon: cat?.icon || Film,
      color: cat?.color || 'from-gray-500 to-gray-600',
      emoji: cat?.emoji || '🎬'
    }
  }

  // Interest Selection Modal
  if (showInterestModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to Video Feed! 🎬</h1>
              <p className="text-gray-500">Select your interests to get personalized video recommendations</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {VIDEO_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.includes(category.id)
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategories(prev => prev.filter(c => c !== category.id))
                      } else {
                        setSelectedCategories(prev => [...prev, category.id])
                      }
                    }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-orange-500 bg-gradient-to-r ${category.color} text-white shadow-md`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{category.emoji}</span>
                      <span className="text-xs font-medium">{category.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Select all categories
                  if (selectedCategories.length === VIDEO_CATEGORIES.length) {
                    setSelectedCategories([])
                  } else {
                    setSelectedCategories(VIDEO_CATEGORIES.map(c => c.id))
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50"
              >
                {selectedCategories.length === VIDEO_CATEGORIES.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={saveInterests}
                disabled={selectedCategories.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium disabled:opacity-50"
              >
                Continue ({selectedCategories.length} selected)
              </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              You can change these preferences later in settings
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && videos.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6" ref={videoContainerRef}>
        
        {/* Header with Categories */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Video Feed</h1>
              <p className="text-sm text-gray-500">Videos personalized for you</p>
            </div>
            
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse hover:opacity-90"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {newVideosCount} new {newVideosCount === 1 ? 'video' : 'videos'}
              </button>
            )}
          </div>
          
          {/* Selected categories chips */}
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(catId => {
              const category = VIDEO_CATEGORIES.find(c => c.id === catId)
              if (!category) return null
              return (
                <span
                  key={catId}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${category.color} text-white`}
                >
                  <span>{category.emoji}</span>
                  {category.name}
                </span>
              )
            })}
            <button
              onClick={() => setShowInterestModal(true)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              Edit Interests
            </button>
          </div>
        </div>
        
        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => {
            const categoryStyle = getCategoryStyle(video.category)
            const CategoryIcon = categoryStyle.icon
            
            return (
              <div
                key={video.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="h-12 w-12 text-white fill-white" />
                  </div>
                  {/* Category badge */}
                  <div className={`absolute top-2 left-2 bg-gradient-to-r ${categoryStyle.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
                    <CategoryIcon className="h-3 w-3" />
                    <span>{video.category}</span>
                  </div>
                </div>
                
                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 hover:text-orange-600 transition">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>{video.channelTitle}</span>
                    <span>•</span>
                    <span>{formatViews(video.viewCount)} views</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}</span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(video.id) }}
                      className={`flex items-center gap-1 text-xs transition ${
                        likedVideos.has(video.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${likedVideos.has(video.id) ? 'fill-red-500' : ''}`} />
                      Like
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(video.id) }}
                      className={`flex items-center gap-1 text-xs transition ${
                        savedVideos.has(video.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${savedVideos.has(video.id) ? 'fill-blue-500' : ''}`} />
                      Save
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); shareVideo(video.id) }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-500 transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Loading more indicator */}
        {hasMore && !loading && !refreshing && videos.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading more videos...</span>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="font-bold text-gray-900 mb-1">No videos found</h3>
            <p className="text-sm text-gray-500">Try selecting different interests</p>
            <button
              onClick={() => setShowInterestModal(true)}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium"
            >
              Change Interests
            </button>
          </div>
        )}
        
        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onLike={() => toggleLike(selectedVideo.id)}
            onSave={() => toggleSave(selectedVideo.id)}
            isLiked={likedVideos.has(selectedVideo.id)}
            isSaved={savedVideos.has(selectedVideo.id)}
          />
        )}
      </main>
      
      {/* FAB */}
      <ThreeCurveFab />
      
      {/* Story Viewer */}
      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}
    </div>
  )
}

// Video Player Modal Component
function VideoPlayerModal({ 
  video, 
  onClose, 
  onLike, 
  onSave,
  isLiked,
  isSaved
}: { 
  video: Video
  onClose: () => void
  onLike: () => void
  onSave: () => void
  isLiked: boolean
  isSaved: boolean
}) {
  const [isMuted, setIsMuted] = useState(true)
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Video iframe */}
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=${isMuted ? 1 : 0}`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        
        {/* Video Info */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-white font-bold text-lg mb-2">{video.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-white/80 text-sm">{video.channelTitle}</span>
              <span className="text-white/60 text-sm">{formatViews(video.viewCount)} views</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onLike} className="flex items-center gap-1 text-white/80 hover:text-red-500 transition">
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <button onClick={onSave} className="flex items-center gap-1 text-white/80 hover:text-blue-500 transition">
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-blue-500 text-blue-500' : ''}`} />
              </button>
              <button onClick={() => shareVideo(video.videoId)} className="text-white/80 hover:text-green-500 transition">
                <Share2 className="h-5 w-5" />
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className="text-white/80 hover:text-white transition">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

// Helper functions
function shareVideo(videoId: string) {
  const url = `https://youtube.com/watch?v=${videoId}`
  navigator.clipboard.writeText(url)
}

function formatViews(views: string) {
  const num = parseInt(views)
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Mock videos for fallback
function getMockVideos(categories: string[]): Video[] {
  const mockVideos = [
    {
      id: '1',
      videoId: 'dQw4w9WgXcQ',
      title: 'Amazing Technology Innovations 2024',
      description: 'The latest tech breakthroughs',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
      channelTitle: 'Tech Today',
      channelId: 'tech1',
      viewCount: '1500000',
      likeCount: '50000',
      duration: 'PT5M30S',
      publishedAt: new Date().toISOString(),
      category: categories[0] || 'technology'
    },
    {
      id: '2',
      videoId: '2',
      title: '10 Minute Full Body Workout',
      description: 'Get fit at home',
      thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      channelTitle: 'Fitness Pro',
      channelId: 'fitness1',
      viewCount: '890000',
      likeCount: '34000',
      duration: 'PT10M',
      publishedAt: new Date().toISOString(),
      category: categories[1] || 'fitness'
    },
    {
      id: '3',
      videoId: '3',
      title: 'Latest Movie Trailer',
      description: 'Coming this summer',
      thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
      channelTitle: 'Entertainment Weekly',
      channelId: 'ent1',
      viewCount: '2500000',
      likeCount: '120000',
      duration: 'PT2M15S',
      publishedAt: new Date().toISOString(),
      category: categories[2] || 'entertainment'
    }
  ]
  
  // Generate more mock videos
  for (let i = 4; i <= 12; i++) {
    const category = categories[i % categories.length] || 'technology'
    mockVideos.push({
      id: i.toString(),
      videoId: i.toString(),
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Video ${i}`,
      description: `Amazing ${category} content`,
      thumbnail: `https://picsum.photos/seed/${i}/400/225`,
      channelTitle: `${category} Creator`,
      channelId: `${category}${i}`,
      viewCount: `${Math.floor(Math.random() * 1000000)}`,
      likeCount: `${Math.floor(Math.random() * 50000)}`,
      duration: `PT${Math.floor(Math.random() * 10) + 1}M${Math.floor(Math.random() * 59)}S`,
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: category
    })
  }
  
  return mockVideos
}

// RefreshCw icon component
function RefreshCw(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
