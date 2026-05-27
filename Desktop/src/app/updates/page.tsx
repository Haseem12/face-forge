// app/updates/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, Heart, Share2, Bookmark, Volume2, VolumeX,
  RefreshCw, Sparkles, User, Music, MessageCircle,
  Plus, Camera
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Video {
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
  }
}

export default function UpdatesPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<any[]>([])
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch current user and following list
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)
      
      // Get following list
      const { data: allies } = await supabase
        .from('allies')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const followingIds = new Set(allies?.map(a => a.following_id) || [])
      setFollowing(followingIds)
      
      fetchVideos()
    }
    getUser()
  }, [supabase, router])

  const fetchVideos = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get videos from followed users
      const { data: allies } = await supabase
        .from('allies')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const followingIds = allies?.map(a => a.following_id) || []
      
      if (followingIds.length === 0) {
        setVideos([])
        setLoading(false)
        return
      }
      
      const { data: videosData, error } = await supabase
        .from('user_videos')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .in('user_id', followingIds)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      setVideos(videosData || [])
      
      // Get user's likes and saves
      if (videosData?.length) {
        const videoIds = videosData.map(v => v.id)
        
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('video_likes').select('video_id').eq('user_id', user.id).in('video_id', videoIds),
          supabase.from('video_saves').select('video_id').eq('user_id', user.id).in('video_id', videoIds)
        ])
        
        setLikedVideos(new Set(likes?.map(l => l.video_id) || []))
        setSavedVideos(new Set(saves?.map(s => s.video_id) || []))
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
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
      if (prevVideo) prevVideo.pause()
      
      setCurrentVideoIndex(newIndex)
      
      const newVideo = videoRefs.current[newIndex]
      if (newVideo) newVideo.play().catch(e => console.log('Play error:', e))
    }
  }, [currentVideoIndex, videos.length])

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
      // Update like count
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, like_count: v.like_count - 1 } : v
      ))
    } else {
      await supabase.from('video_likes').insert({ video_id: videoId, user_id: currentUser.id })
      setLikedVideos(prev => new Set(prev).add(videoId))
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, like_count: v.like_count + 1 } : v
      ))
    }
  }

  const toggleSave = async (videoId: string) => {
    if (!currentUser) return
    
    const isSaved = savedVideos.has(videoId)
    
    if (isSaved) {
      await supabase.from('video_saves').delete().eq('video_id', videoId).eq('user_id', currentUser.id)
      setSavedVideos(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    } else {
      await supabase.from('video_saves').insert({ video_id: videoId, user_id: currentUser.id })
      setSavedVideos(prev => new Set(prev).add(videoId))
    }
  }

  const addComment = async () => {
    if (!commentText.trim() || !currentUser) return
    
    const currentVideo = videos[currentVideoIndex]
    if (!currentVideo) return
    
    await supabase.from('video_comments').insert({
      video_id: currentVideo.id,
      user_id: currentUser.id,
      comment: commentText
    })
    
    setCommentText('')
    fetchComments(currentVideo.id)
    
    // Update comment count
    setVideos(prev => prev.map(v => 
      v.id === currentVideo.id ? { ...v, comment_count: v.comment_count + 1 } : v
    ))
  }

  const fetchComments = async (videoId: string) => {
    const { data } = await supabase
      .from('video_comments')
      .select(`
        *,
        profiles:user_id (display_name, avatar_url)
      `)
      .eq('video_id', videoId)
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

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading reels...</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-white/50" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">No reels yet</h2>
          <p className="text-white/50 text-sm mb-6">
            Follow creators to see their reels here
          </p>
          <Link href="/discover">
            <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-medium">
              Discover Creators
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Create Button */}
      <Link href="/create-reel">
        <button className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 shadow-lg flex items-center justify-center active:scale-95 transition">
          <Plus className="h-6 w-6 text-white" />
        </button>
      </Link>
      
      {/* Videos Container */}
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
            {/* Video */}
            <video
              ref={el => { videoRefs.current[index] = el }}
              src={video.video_url}
              className="absolute inset-0 w-full h-full object-cover"
              loop={false}
              muted={isMuted}
              playsInline
              poster={video.thumbnail_url}
              onEnded={() => handleVideoEnded(index)}
            />
            
            {/* Right Side Actions */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
              <button
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Heart className={`h-6 w-6 ${likedVideos.has(video.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs font-medium">{formatNumber(video.like_count)}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowComments(true)
                  fetchComments(video.id)
                }}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{formatNumber(video.comment_count)}</span>
              </button>
              
              <button
                onClick={() => toggleSave(video.id)}
                className="flex flex-col items-center gap-0.5 active:scale-95 transition"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                  <Bookmark className={`h-6 w-6 ${savedVideos.has(video.id) ? 'fill-blue-500 text-blue-500' : 'text-white'}`} />
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
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    {video.profiles?.avatar_url ? (
                      <Image
                        src={video.profiles.avatar_url}
                        alt={video.profiles.display_name}
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {video.profiles?.display_name || 'User'}
                  </p>
                  <p className="text-white/50 text-xs">
                    {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button className="px-4 py-1.5 bg-white rounded-full text-black text-xs font-bold">
                  Follow
                </button>
              </div>
              
              {video.caption && (
                <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                  {video.caption}
                </p>
              )}
              
              <div className="flex items-center gap-1">
                <Music className="h-3.5 w-3.5 text-white/60" />
                <p className="text-white/60 text-xs">
                  {video.music_name || 'Original Sound'}
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
                        {comment.profiles?.display_name}
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
