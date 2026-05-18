'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, Smile, Loader2, X, Heart } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'

interface Comment {
  id: string
  content: string
  user_id: string
  likes_count: number
  created_at: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
}

interface CommentDrawerProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  postType: 'news' | 'feed'
  currentUserId: string
  onCommentAdded?: () => void
}

export default function CommentDrawer({ 
  isOpen, 
  onClose, 
  postId, 
  postType, 
  currentUserId,
  onCommentAdded 
}: CommentDrawerProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  
  const drawerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Detect keyboard height on mobile
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard opens, viewport height changes
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      const diff = windowHeight - viewportHeight
      if (diff > 150) {
        setKeyboardHeight(diff)
      } else {
        setKeyboardHeight(0)
      }
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Validate postId
  useEffect(() => {
    if (isOpen && (!postId || postId === '')) {
      console.error('CommentDrawer: Invalid postId:', postId)
      onClose()
    }
  }, [isOpen, postId, onClose])

  // Get current user profile
  useEffect(() => {
    const getProfile = async () => {
      if (!currentUserId) return
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username')
        .eq('id', currentUserId)
        .single()
      setCurrentUserProfile(data)
    }
    getProfile()
  }, [currentUserId, supabase])

  // Load comments when drawer opens
  useEffect(() => {
    if (isOpen && postId && postId !== '') {
      loadComments()
      setTimeout(() => {
        inputRef.current?.focus()
        // Scroll to bottom of comments
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [isOpen, postId])

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const loadComments = async () => {
    if (!postId || postId === '') return
    
    setLoading(true)
    try {
      let data, error
      
      if (postType === 'news') {
        const result = await supabase
          .from('news_comments')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('article_id', postId)
          .order('created_at', { ascending: true })
        data = result.data
        error = result.error
      } else {
        const result = await supabase
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
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
        data = result.data
        error = result.error
      }
      
      if (error) throw error
      setComments(data || [])
      
      if (currentUserId && data?.length) {
        const likeTable = postType === 'news' ? 'news_comment_likes' : 'comment_likes'
        const commentIds = data.map(c => c.id)
        const { data: likedData } = await supabase
          .from(likeTable)
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', commentIds)
        setLikedComments(new Set(likedData?.map(l => l.comment_id) || []))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) return
    
    const isLiked = likedComments.has(commentId)
    const likeTable = postType === 'news' ? 'news_comment_likes' : 'comment_likes'
    
    if (isLiked) {
      await supabase
        .from(likeTable)
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
        .from(likeTable)
        .insert({ comment_id: commentId, user_id: currentUserId })
      setLikedComments(prev => new Set(prev).add(commentId))
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c
      ))
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !postId || postId === '') return
    
    setSubmitting(true)
    try {
      let data, error
      
      if (postType === 'news') {
        const result = await supabase
          .from('news_comments')
          .insert({
            article_id: postId,
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
        data = result.data
        error = result.error
      } else {
        const result = await supabase
          .from('post_comments')
          .insert({
            post_id: postId,
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
        data = result.data
        error = result.error
      }
      
      if (error) throw error
      
      if (data) {
        setComments(prev => [...prev, data])
        setCommentText('')
        onCommentAdded?.()
        // Scroll to bottom after new comment
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setSubmitting(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer - adjusted for keyboard */}
      <div 
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slide-up flex flex-col"
        style={{ 
          maxHeight: keyboardHeight > 0 ? 'calc(85vh - 100px)' : '85vh',
          height: keyboardHeight > 0 ? 'auto' : 'auto',
          paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900">
            Comments ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Comments List - Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[50vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/profile/${comment.profiles?.username}`}>
                  {comment.profiles?.avatar_url ? (
                    <Image 
                      src={comment.profiles.avatar_url} 
                      alt="" 
                      width={36} 
                      height={36} 
                      className="rounded-full object-cover" 
                      unoptimized 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {comment.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2">
                    <Link href={`/profile/${comment.profiles?.username}`}>
                      <p className="text-xs font-semibold text-gray-900 hover:text-orange-600">
                        {comment.profiles?.display_name}
                      </p>
                    </Link>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      <Heart className={`h-3 w-3 ${likedComments.has(comment.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{comment.likes_count || 0}</span>
                    </button>
                    <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Input - Fixed at bottom */}
        <div className="border-t border-gray-100 p-3 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentUserProfile?.avatar_url ? (
              <Image 
                src={currentUserProfile.avatar_url} 
                alt="" 
                width={32} 
                height={32} 
                className="rounded-full object-cover flex-shrink-0" 
                unoptimized 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {currentUserProfile?.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-300 transition">
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent outline-none text-sm py-1"
              />
              <button className="p-1 text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                <Smile className="h-5 w-5" />
              </button>
              {commentText && (
                <button
                  onClick={handleSubmitComment}
                  disabled={submitting}
                  className="ml-1 p-1 text-orange-500 hover:text-orange-600 transition flex-shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  )
}

// Helper icon component
function MessageCircleIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
