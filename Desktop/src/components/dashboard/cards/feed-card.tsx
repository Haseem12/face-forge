'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  Bookmark, Send, Smile, Image as ImageIcon, 
  Video, X, Trash2, Flag, Copy, UserPlus, UserMinus,
  Volume2, VolumeX, Play, Pause
} from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'

export interface FeedPost {
  id: string
  user_id: string
  content: string
  title?: string
  media_url?: string
  media_type?: 'image' | 'video'
  category?: string
  tags?: string[]
  feeling?: string
  feeling_emoji?: string
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
}

export default function FeedCard({
  post,
  isFollowing,
  isLiked,
  currentUserId,
  commentCount,
  onFollow,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  onReport,
  onTagClick,
}: {
  post: FeedPost
  isFollowing: boolean
  isLiked: boolean
  currentUserId: string
  commentCount: number
  onFollow: () => void
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onDelete?: () => void
  onEdit?: () => void
  onReport?: () => void
  onTagClick?: (tag: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLiking, setIsLiking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const creator = post.profiles
  const isImage = post.media_type === 'image'
  const isVideo = post.media_type === 'video'
  const tags = post.tags || []
  const isOwnPost = currentUserId === post.user_id

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLikeWithFeedback = () => {
    setIsLiking(true)
    onLike()
    setTimeout(() => setIsLiking(false), 300)
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (commentText.trim()) {
      onComment()
      setCommentText('')
      setShowComments(false)
    }
  }

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setVideoProgress(progress)
    }
  }

  if (!creator) return null

  return (
    <article className="bg-white border border-gray-200 w-full max-w-2xl mx-auto mb-4">
      
      {/* Header - Profile, Name, @, Emotion, Time */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${creator.username}`}>
            <AvatarCircle src={creator.avatar_url} name={creator.display_name} size={40} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${creator.username}`}>
                <span className="font-semibold text-gray-900 hover:underline text-[15px]">
                  {creator.display_name}
                </span>
              </Link>
              <Link href={`/profile/${creator.username}`}>
                <span className="text-gray-500 text-[13px]">@{creator.username}</span>
              </Link>
              <span className="text-gray-400 text-[13px]">·</span>
              <span className="text-gray-400 text-[13px]">{timeAgo(post.created_at)}</span>
            </div>
            
            {/* Emotion/Feeling */}
            {post.feeling && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm">{post.feeling_emoji || '😊'}</span>
                <span className="text-xs text-gray-500">feeling {post.feeling}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Three dots menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white shadow-lg border border-gray-200 z-20">
              {isOwnPost ? (
                <>
                  <button 
                    onClick={() => { onEdit?.(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                    Edit post
                  </button>
                  <button 
                    onClick={() => { onDelete?.(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    Delete post
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => { onReport?.(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Flag className="h-4 w-4 text-gray-500" />
                    Report post
                  </button>
                  <button 
                    onClick={() => { onFollow(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100"
                  >
                    {isFollowing ? (
                      <><UserMinus className="h-4 w-4 text-gray-500" /> Unfollow {creator.display_name}</>
                    ) : (
                      <><UserPlus className="h-4 w-4 text-gray-500" /> Follow {creator.display_name}</>
                    )}
                  </button>
                  <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                    <Copy className="h-4 w-4 text-gray-500" />
                    Copy link
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content / Writeup */}
      <div className="px-4 pb-3">
        {post.title && (
          <h3 className="font-bold text-gray-900 text-[17px] mb-1">{post.title}</h3>
        )}
        <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
      </div>

      {/* Media - Image or Video (No "media attached" text) */}
      {post.media_url && (
        <div className="mb-3">
          {isImage ? (
            <img
              src={post.media_url}
              alt={post.title || "Post image"}
              className="w-full"
            />
          ) : isVideo && (
            <div className="relative bg-black">
              <video
                ref={videoRef}
                src={post.media_url}
                className="w-full cursor-pointer"
                onClick={toggleVideoPlay}
                onTimeUpdate={handleVideoTimeUpdate}
                playsInline
              />
              
              {/* Video controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity">
                {/* Progress bar */}
                <div className="w-full h-1 bg-white/30 rounded-full mb-2 cursor-pointer">
                  <div 
                    className="h-full bg-white rounded-full"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleVideoPlay}
                    className="text-white hover:text-gray-300 transition"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-gray-300 transition"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  
                  <span className="text-white text-xs">
                    {videoRef.current ? 
                      `${Math.floor(videoRef.current.currentTime)}s / ${Math.floor(videoRef.current.duration)}s` : 
                      '0s / 0s'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-[13px] text-blue-500 hover:text-blue-600 hover:underline"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Stats row - Likes and Comments */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-[13px] text-gray-500">
          <div className="flex items-center gap-1">
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{post.likes_count || 0}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowComments(!showComments)} className="hover:text-blue-500">
              {commentCount || 0} comments
            </button>
            <button>{post.shares_count || 0} shares</button>
          </div>
        </div>
      </div>

      {/* Interaction Buttons */}
      <div className="flex border-t border-gray-100">
        <button
          onClick={handleLikeWithFeedback}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : ''} ${isLiking ? 'scale-125' : ''} transition-transform`} />
          Like
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 hover:text-blue-500 hover:bg-blue-50"
        >
          <MessageCircle className="h-5 w-5" />
          Comment
        </button>
        
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 hover:text-green-500 hover:bg-green-50"
        >
          <Share2 className="h-5 w-5" />
          Share
        </button>
      </div>

      {/* Follow button (if not own post) */}
      {!isOwnPost && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onFollow}
            className={`w-full py-2 text-sm font-semibold transition-colors ${
              isFollowing
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isFollowing ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <AvatarCircle src={creator.avatar_url} name={creator.display_name} size={32} />
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            {commentText.trim() && (
              <button type="submit" className="text-black font-semibold text-sm">
                Post
              </button>
            )}
          </form>
        </div>
      )}
    </article>
  )
}
