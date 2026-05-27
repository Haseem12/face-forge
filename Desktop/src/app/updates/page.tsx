// app/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, Clock, Eye, Heart, Share2, Play, Bookmark, Volume2, VolumeX,
  RefreshCw, Sparkles, Flame, TrendingUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import ThreeCurveFab from '@/components/dashboard/layout/three-curve-fab'

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
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set())
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [newVideosCount, setNewVideosCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const categoriesScrollRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

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
      
      const videosList: Video[] = (data.videos || []).map((v: any) => ({
        id: v.id || v.videoId || `video_${Math.random()}`,
        videoId: v.videoId || v.id,
        title: v.title || 'Untitled',
        description: v.description || '',
        thumbnail: v.thumbnail || v.thumbnail_url || `https://picsum.photos/seed/${Math.random()}/400/225`,
        channelTitle: v.channelTitle || v.channel_title || 'Channel',
        channelId: v.channelId || '',
        viewCount: v.viewCount || Math.floor(Math.random() * 1000000).toString(),
        likeCount: v.likeCount || Math.floor(Math.random() * 50000).toString(),
        duration: v.duration || `PT${Math.floor(Math.random() * 10) + 1}M`,
        publishedAt: v.publishedAt || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: category
      }))
      
      if (isRefresh || pageNum === 1) {
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
      // Return mock data
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

  // Handle manual refresh
  const handleRefresh = async () => {
    if (refreshing) return
    await fetchVideos(1, selectedCategory, true)
  }

  // Format view count
  const formatViews = (views: string) => {
    const num = parseInt(views)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Format duration
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

  // Infinite scroll observer
  useEffect(() => {
    if (!hasSetInterests) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !refreshing) {
          const nextPage = page + 1
          setPage(nextPage)
          await fetchVideos(nextPage, selectedCategory, false)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    
    return () => observer.disconnect()
  }, [hasMore, loading, refreshing, page, hasSetInterests, selectedCategory])

  // Mock videos generator
  const getMockVideos = (category: string, count: number): Video[] => {
    const titles = [
      `Top 10 ${category} Trends You Need to Know`,
      `Amazing ${category} Breakthroughs 2024`,
      `Ultimate ${category} Guide for Beginners`,
      `${category} Experts Share Their Secrets`,
      `Best ${category} Moments Compilation`,
      `How to Master ${category} in 10 Minutes`,
      `The Future of ${category} - What's Next?`,
      `Inspiring ${category} Success Stories`
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
        thumbnail: `https://picsum.photos/seed/${category}_${i}/400/225`,
        channelTitle: channels[i % channels.length],
        channelId: `channel_${i}`,
        viewCount: `${Math.floor(Math.random() * 5000000)}`,
        likeCount: `${Math.floor(Math.random() * 200000)}`,
        duration: `PT${Math.floor(Math.random() * 15) + 1}M${Math.floor(Math.random() * 59)}S`,
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
            <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to Video Feed! 🎬</h1>
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
      <div className="bg-gray-50 min-h-screen">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-12 bg-gray-200 rounded-full w-full mb-6 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
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
      
      <main className="max-w-7xl mx-auto px-4 py-4" ref={videoContainerRef}>
        
        {/* Category Tabs - Horizontal Scroll, Mobile Touch Friendly */}
        <div className="mb-6">
          <div 
            ref={categoriesScrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {VIDEO_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 touch-manipulation ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-black text-gray-900">{selectedCategory}</h2>
            {lastUpdated && (
              <span className="text-[10px] text-gray-400">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            )}
          </div>
          
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse active:scale-95 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {newVideosCount} new
            </button>
          )}
        </div>
        
        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatDuration(video.duration)}
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="h-12 w-12 text-white fill-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* Video Info */}
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                  {video.title}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="truncate">{video.channelTitle}</span>
                  <span>•</span>
                  <span>{formatViews(video.viewCount)} views</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(video.id) }}
                    className={`flex items-center gap-1 text-xs transition active:scale-95 touch-manipulation ${
                      likedVideos.has(video.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedVideos.has(video.id) ? 'fill-red-500' : ''}`} />
                    <span>Like</span>
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(video.id) }}
                    className={`flex items-center gap-1 text-xs transition active:scale-95 touch-manipulation ${
                      savedVideos.has(video.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${savedVideos.has(video.id) ? 'fill-blue-500' : ''}`} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Loading more indicator */}
        {hasMore && !loading && !refreshing && videos.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="font-bold text-gray-900 mb-1">No videos found</h3>
            <p className="text-sm text-gray-500">Try a different category</p>
          </div>
        )}
      </main>
      
      {/* FAB */}
      <ThreeCurveFab />
      
      {/* Story Viewer */}
      {viewingStoryUserId && (
        <StoryViewer 
          userId={viewingStoryUserId} 
          onClose={() => setViewingStoryUserId(null)} 
        />
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
  
  const formatViews = (views: string) => {
    const num = parseInt(views)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Video iframe - using embedded player */}
        <div className="aspect-video">
          {video.videoId.startsWith('mock_') ? (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Play className="h-16 w-16 text-white/50" />
            </div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&rel=0`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        
        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <h3 className="text-white font-bold text-base mb-2 line-clamp-2">{video.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm">{video.channelTitle}</span>
              <span className="text-white/60 text-xs">{formatViews(video.viewCount)} views</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLike} 
                className={`flex flex-col items-center gap-0.5 transition active:scale-95 ${
                  isLiked ? 'text-red-500' : 'text-white/80 hover:text-red-500'
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : ''}`} />
                <span className="text-[10px]">Like</span>
              </button>
              <button 
                onClick={onSave} 
                className={`flex flex-col items-center gap-0.5 transition active:scale-95 ${
                  isSaved ? 'text-blue-500' : 'text-white/80 hover:text-blue-500'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-blue-500' : ''}`} />
                <span className="text-[10px]">Save</span>
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                <span className="text-[10px]">Sound</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-white/80 bg-black/50 rounded-full p-2 hover:text-white active:scale-95 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
