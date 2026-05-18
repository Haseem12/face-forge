'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Share2, Check, ExternalLink, MoreHorizontal, Copy, Download, Eye, Send, Smile, Loader2, X } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getArticleImage } from '@/lib/dashboard/image-helper'
import { createClient } from '@/lib/supabase/client'

interface NewsArticle {
  id: string
  title: string
  description?: string
  url: string
  urlToImage?: string | null
  source: { name: string }
  publishedAt: string
  caption?: string
  media_url?: string
}

interface NewsComment {
  id: string
  article_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
}

export default function NewsCard({
  article,
  isLiked,
  commentCount,
  shareCopied,
  onLike,
  onComment,
  onShare,
  onReadInside,
}: {
  article: NewsArticle
  isLiked: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onReadInside: () => void
}) {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<NewsComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [localCommentCount, setLocalCommentCount] = useState(commentCount || 0)
  
  const menuRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const title = article.caption || article.title || "Untitled"
  const sourceName = article.source?.name || "News Source"
  const originalImage = article.media_url || article.urlToImage

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, username')
          .eq('id', user.id)
          .single()
        
        setCurrentUserProfile(profile)
      }
    }
    getUser()
  }, [supabase])

  // Load image
  useEffect(() => {
    const loadImage = async () => {
      setImageLoading(true)
      const url = await getArticleImage(title, originalImage)
      setImageUrl(url)
      setImageLoading(false)
    }
    loadImage()
  }, [title, originalImage])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowImageMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load comments
  const loadComments = async () => {
    if (!article?.id) return
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
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
        .eq('article_id', article.id)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setComments(data || [])
      setLocalCommentCount(data?.length || 0)
      
      if (currentUserId && data?.length) {
        const commentIds = data.map(c => c.id)
        const { data: likedData } = await supabase
          .from('news_comment_likes')
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
    if (!currentUserId) return
    
    const isLiked = likedComments.has(commentId)
    
    if (isLiked) {
      await supabase
        .from('news_comment_likes')
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
        .from('news_comment_likes')
        .insert({ comment_id: commentId, user_id: currentUserId })
      setLikedComments(prev => new Set(prev).add(commentId))
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c
      ))
    }
  }

  // Handle submit comment
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !article?.id || !currentUserId) return
    
    setSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('news_comments')
        .insert({
          article_id: article.id,
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
      alert('Failed to post comment. Please try again.')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2000)
        setShowImageMenu(false)
      } catch (error) {
        console.error('Failed to copy image:', error)
      }
    }
  }

  // Download image
  const handleDownloadImage = () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `news-${Date.now()}.jpg`
      link.click()
      setShowImageMenu(false)
    }
  }

  // Handle key press for comment input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md w-full group">
      {/* Top Section: Large Image */}
      <div className="relative w-full h-48 xs:h-52 sm:h-56 bg-gray-50">
        {imageLoading ? (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        ) : imageUrl ? (
          imageUrl.startsWith('data:') ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={onReadInside}
            />
          ) : (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover cursor-pointer"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
              priority
              unoptimized
              onClick={onReadInside}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer" onClick={onReadInside}>
            <div className="text-center">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-gray-500 text-sm">News image</p>
            </div>
          </div>
        )}
        
        {/* Three dots menu on image */}
        {imageUrl && !imageLoading && (
          <div className="absolute top-3 right-3" ref={menuRef}>
            <button
              onClick={() => setShowImageMenu(!showImageMenu)}
              className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <MoreHorizontal className="h-4 w-4 text-white" />
            </button>
            
            {showImageMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-fade-in">
                <button
                  onClick={handleCopyImage}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                >
                  {copiedImage ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedImage ? 'Copied!' : 'Copy image'}
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save image
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Source Badge Overlay */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-black text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full uppercase tracking-wider">
            {sourceName}
          </span>
        </div>

        {/* Read in app overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onReadInside}
            className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transform scale-95 group-hover:scale-100 transition"
          >
            <Eye className="h-4 w-4" />
            Read in app
          </button>
        </div>
      </div>

      {/* Bottom Section: Text & Actions */}
      <div className="p-4">
        <div className="mb-3">
          <button onClick={onReadInside} className="w-full text-left">
            <h3 className="text-[15px] xs:text-base font-bold text-gray-900 leading-tight line-clamp-2 mb-2 hover:text-orange-600 transition">
              {title}
            </h3>
          </button>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
            <span>{timeAgo(article.publishedAt || article.created_at)} ago</span>
            {article.url && (
               <>
                 <span>•</span>
                 <button onClick={onReadInside} className="text-orange-500 font-bold flex items-center gap-0.5 hover:underline">
                   Read <ExternalLink className="h-2.5 w-2.5" />
                 </button>
               </>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.preventDefault(); onLike(); }}
              className={`flex items-center gap-1.5 transition ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="text-[12px] font-bold">Like</span>
            </button>

            <button
              onClick={(e) => { 
                e.preventDefault(); 
                setShowComments(!showComments);
                if (!showComments && comments.length === 0) loadComments();
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-[12px] font-bold">{localCommentCount > 0 ? localCommentCount : 'Comment'}</span>
            </button>

            <button
              onClick={(e) => { e.preventDefault(); onShare(); }}
              className={`flex items-center gap-1.5 transition ${
                shareCopied ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
              }`}
            >
              {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="text-[12px] font-bold">Share</span>
            </button>
          </div>

          <button
            onClick={onReadInside}
            className="text-orange-500 hover:text-orange-600 text-xs font-bold flex items-center gap-1"
          >
            Read
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            {/* Comment Input */}
            <div className="flex items-center gap-2 mb-3">
              {currentUserProfile?.avatar_url ? (
                <Image 
                  src={currentUserProfile.avatar_url} 
                  alt="" 
                  width={32} 
                  height={32} 
                  className="rounded-full object-cover" 
                  unoptimized 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {currentUserProfile?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-300 transition">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Write a comment..."
                  className="flex-1 bg-transparent outline-none text-sm py-1"
                />
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
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {loadingComments && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
                      <p className="text-xs font-semibold text-gray-900">
                        {comment.profiles?.display_name}
                      </p>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2">
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
                      >
                        {likedComments.has(comment.id) ? 'Liked' : 'Like'}
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
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </article>
  )
}
