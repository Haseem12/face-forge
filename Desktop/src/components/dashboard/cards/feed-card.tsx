'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Send, 
  Smile, X, Loader2, Check, ThumbsUp, MapPin, Flag, Bookmark,
  Edit2, Trash2, Volume2, VolumeX
} from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'

interface FeedPost {
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
  location?: string
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
}

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  likes_count: number
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
  onTagClick?: (tag: string) => void
}) {
  const supabase = createClient()
  const creator = post.profiles
  const isOwner = currentUserId === post.user_id
  const contentLength = post.content?.length || 0
  const shouldTruncate = contentLength > 200
  const [showFullContent, setShowFullContent] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount)
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count || 0)
  const [localIsLiked, setLocalIsLiked] = useState(isLiked)
  const [currentUserAvatar, setCurrentUserAvatar] = useState('')
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState('')
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const displayContent = shouldTruncate && !showFullContent 
    ? post.content?.slice(0, 200) + '...' 
    : post.content

  // Fetch current user's avatar and display name
  useEffect(() => {
    const getCurrentUserInfo = async () => {
      if (currentUserId) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', currentUserId)
          .single()
        if (data) {
          setCurrentUserAvatar(data.avatar_url || '')
          setCurrentUserDisplayName(data.display_name || 'User')
        }
      }
    }
    getCurrentUserInfo()
  }, [currentUserId, supabase])

  // Auto-play video when in view
  useEffect(() => {
    if (post.media_type === 'video' && videoRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRef.current?.play()
              setVideoPlaying(true)
            } else {
              videoRef.current?.pause()
              setVideoPlaying(false)
            }
          })
        },
        { threshold: 0.5 }
      )
      observer.observe(videoRef.current)
      return () => observer.disconnect()
    }
  }, [post.media_type])

  // Load comments
  const loadComments = async () => {
    if (!post.id) return
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setComments(data || [])
      
      // Load liked comments
      if (currentUserId && data?.length) {
        const commentIds = data.map(c => c.id)
        const { data: likedData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', commentIds)
        setLikedComments(new Set(likedData?.map(l => l.comment_id) || []))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  // Handle comment like
  const handleCommentLike = async (commentId: string) => {
    const isLiked = likedComments.has(commentId)
    
    if (isLiked) {
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
      setLikedComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(commentId)
        return newSet
      })
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) - 1 } : c
      ))
    } else {
      await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: currentUserId })
      setLikedComments(prev => new Set(prev).add(commentId))
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c
      ))
    }
  }

  // Handle submit comment
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post.id) return
    
    setSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: commentText.trim()
        })
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()
      
      if (error) throw error
      
      if (data) {
        setComments(prev => [...prev, data])
        setCommentText('')
        setLocalCommentCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle share with count increment
  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    await navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
    
    await supabase
      .from('user_feeds')
      .update({ shares_count: (post.shares_count || 0) + 1 })
      .eq('id', post.id)
    
    setShowShareMenu(false)
    onShare()
  }

  // Handle like with optimistic update
  const handleLikeClick = async () => {
    const newLikedState = !localIsLiked
    setLocalIsLiked(newLikedState)
    setLocalLikesCount(prev => newLikedState ? prev + 1 : prev - 1)
    
    if (newLikedState) {
      await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: currentUserId })
    } else {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
    }
    
    onLike()
  }

  // Handle delete post
  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    const { error } = await supabase
      .from('user_feeds')
      .delete()
      .eq('id', post.id)
    
    if (!error) {
      window.location.reload()
    }
  }

  // Toggle video mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !videoMuted
      setVideoMuted(!videoMuted)
    }
  }

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.transform = 'scale(0.98)'
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.transform = 'scale(1)'
  }

  const tags = post.tags || []

  return (
    <article className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 w-full max-w-2xl mx-auto transition-all duration-200 overflow-hidden">
      
      {/* ========== HEADER ========== */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${creator?.username}`}>
            <div className="relative">
              {creator?.avatar_url ? (
                <Image 
                  src={creator.avatar_url} 
                  alt="" 
                  width={40} 
                  height={40} 
                  className="rounded-full object-cover cursor-pointer hover:opacity-90 transition" 
                  unoptimized 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {creator?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1">
              <Link href={`/profile/${creator?.username}`}>
                <p className="font-semibold text-gray-900 hover:underline text-sm">
                  {creator?.display_name}
                </p>
              </Link>
              
              {/* Feeling - small, next to username */}
              {post.feeling && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <span>is feeling</span>
                  <span className="font-medium text-gray-700">{post.feeling}</span>
                  <span>{post.feeling_emoji}</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{timeAgo(post.created_at)}</span>
              {post.location && (
                <>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{post.location}</span>
                </>
              )}
              <span>•</span>
              <span>🌐</span>
            </div>
          </div>
          
          {/* Menu Button */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 transition active:scale-95"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <MoreHorizontal className="h-5 w-5 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 animate-fade-in">
                {isOwner ? (
                  <>
                    <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                      <Edit2 className="h-4 w-4" />
                      Edit Post
                    </button>
                    <button 
                      onClick={handleDeletePost}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                      <Bookmark className="h-4 w-4" />
                      Save Post
                    </button>
                    <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div className="px-4 mb-3">
        {post.title && (
          <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
        )}
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-sm text-gray-400 hover:text-gray-600 font-medium mt-1 active:text-orange-500"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {showFullContent ? 'See less' : 'See more'}
          </button>
        )}
      </div>

      {/* ========== TAGS ========== */}
      {tags.length > 0 && (
        <div className="px-4 mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-xs text-orange-500 hover:text-orange-600 hover:underline transition active:scale-95"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* ========== MEDIA - Responsive Video ========== */}
      {post.media_url && (
        <div className="mb-2 bg-black/5">
          {post.media_type === 'image' ? (
            <div className="relative">
              <img
                src={post.media_url}
                alt="Post"
                className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition"
                onClick={() => window.open(post.media_url, '_blank')}
              />
            </div>
          ) : post.media_type === 'video' ? (
            <div className="relative w-full">
              <video
                ref={videoRef}
                src={post.media_url}
                className="w-full max-h-[500px] object-contain"
                autoPlay
                muted
                loop
                playsInline
                poster="/video-placeholder.jpg"
              />
              {/* Mute/Unmute button */}
              <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
              >
                {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ========== STATS ========== */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <ThumbsUp className="h-3 w-3 fill-blue-500 text-blue-500" />
            <Heart className="h-3 w-3 fill-red-500 text-red-500 -ml-1" />
          </div>
          <span>{localLikesCount}</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setShowComments(!showComments)
              if (!showComments && comments.length === 0) loadComments()
              setTimeout(() => commentInputRef.current?.focus(), 100)
            }}
            className="hover:text-gray-600 transition"
          >
            {localCommentCount} comments
          </button>
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="hover:text-gray-600 transition"
          >
            {post.shares_count || 0} shares
          </button>
        </div>
      </div>

      {/* ========== ACTION BUTTONS ========== */}
      <div className="flex items-center justify-around py-1 border-b border-gray-100">
        <button
          onClick={handleLikeClick}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition active:scale-95 ${
            localIsLiked ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {localIsLiked ? (
            <ThumbsUp className="h-5 w-5 fill-blue-500" />
          ) : (
            <ThumbsUp className="h-5 w-5" />
          )}
          <span className={localIsLiked ? 'text-blue-500' : ''}>Like</span>
        </button>

        <button
          onClick={() => {
            setShowComments(!showComments)
            if (!showComments && comments.length === 0) loadComments()
            setTimeout(() => commentInputRef.current?.focus(), 100)
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition active:scale-95"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <MessageCircle className="h-5 w-5" />
          Comment
        </button>

        <div className="relative flex-1" ref={shareRef}>
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition active:scale-95"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>
          {showShareMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 animate-slide-up">
              <button
                onClick={handleSharePost}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
              >
                {shareCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {shareCopied ? 'Copied!' : 'Copy link'}
              </button>
              <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                Share to Feed
              </button>
              <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                Share to Messenger
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========== COMMENTS SECTION ========== */}
      {showComments && (
        <div className="px-4 py-3 bg-gray-50">
          {/* Comment Input */}
          <div className="flex items-center gap-2 mb-3">
            {currentUserId && (
              <Image
                src={currentUserAvatar || '/default-avatar.png'}
                alt=""
                width={32}
                height={32}
                className="rounded-full object-cover"
                unoptimized
              />
            )}
            <div className="flex-1 flex items-center bg-white rounded-full border border-gray-200 px-3 py-1 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder={`Write a comment as ${currentUserDisplayName || 'User'}...`}
                className="flex-1 bg-transparent outline-none text-sm py-2"
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-400 hover:text-gray-600 transition"
              >
                <Smile className="h-5 w-5" />
              </button>
              {commentText && (
                <button
                  onClick={handleSubmitComment}
                  disabled={submittingComment}
                  className="ml-1 p-1 text-orange-500 hover:text-orange-600 transition"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loadingComments && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                {comment.profiles?.avatar_url ? (
                  <Image 
                    src={comment.profiles.avatar_url} 
                    alt="" 
                    width={28} 
                    height={28} 
                    className="rounded-full object-cover" 
                    unoptimized 
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold">
                    {comment.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2">
                    <Link href={`/profile/${comment.profiles?.username}`}>
                      <p className="text-xs font-semibold text-gray-900 hover:underline">
                        {comment.profiles?.display_name}
                      </p>
                    </Link>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium transition active:scale-95"
                    >
                      {likedComments.has(comment.id) ? 'Liked' : 'Like'}
                    </button>
                    <button className="text-xs text-gray-400 hover:text-gray-600 font-medium transition active:scale-95">
                      Reply
                    </button>
                    <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && !loadingComments && (
              <div className="text-center py-4 text-gray-400 text-sm">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
      `}</style>
    </article>
  )
}
