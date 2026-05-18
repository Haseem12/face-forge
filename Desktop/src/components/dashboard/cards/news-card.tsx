'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Share2, Check, ExternalLink, MoreHorizontal, Copy, Download, Eye, MessageCircle, X } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getArticleImage } from '@/lib/dashboard/image-helper'
import { createClient } from '@/lib/supabase/client'
import CommentDrawer from '@/components/dashboard/CommentDrawer'

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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [showCommentDrawer, setShowCommentDrawer] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount || 0)
  
  // Long press menu state
  const [showLongPressMenu, setShowLongPressMenu] = useState(false)
  const [longPressPosition, setLongPressPosition] = useState({ x: 0, y: 0 })
  const [longPressDownloading, setLongPressDownloading] = useState(false)
  const [longPressCopied, setLongPressCopied] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  
  const menuRef = useRef<HTMLDivElement>(null)

  const title = article.caption || article.title || "Untitled"
  const sourceName = article.source?.name || "News Source"
  const originalImage = article.media_url || article.urlToImage

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
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
        setShowLongPressMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ========== LONG PRESS HANDLERS ==========
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setLongPressPosition({ x: touch.clientX, y: touch.clientY })
    
    longPressTimer.current = setTimeout(() => {
      setShowLongPressMenu(true)
    }, 500) // 500ms long press
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setLongPressPosition({ x: e.clientX, y: e.clientY })
    
    longPressTimer.current = setTimeout(() => {
      setShowLongPressMenu(true)
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Download image via long press
  const handleLongPressDownload = async () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return
    
    setLongPressDownloading(true)
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `news-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setShowLongPressMenu(false)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setLongPressDownloading(false)
    }
  }

  // Copy image via long press
  const handleLongPressCopy = async () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return
    
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      setLongPressCopied(true)
      setTimeout(() => setLongPressCopied(false), 2000)
      setTimeout(() => setShowLongPressMenu(false), 500)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  // Share image via long press
  const handleLongPressShare = async () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return
    
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], `news-${Date.now()}.jpg`, { type: blob.type })
      
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: 'Check out this news image',
          files: [file]
        })
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(imageUrl)
        setLongPressCopied(true)
        setTimeout(() => setLongPressCopied(false), 2000)
      }
      setShowLongPressMenu(false)
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  // Copy image to clipboard (existing three-dots menu)
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

  // Download image (existing three-dots menu)
  const handleDownloadImage = () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `news-${Date.now()}.jpg`
      link.click()
      setShowImageMenu(false)
    }
  }

  const handleCommentAdded = () => {
    setLocalCommentCount(prev => prev + 1)
  }

  return (
    <>
      <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md w-full group">
        {/* Top Section: Large Image with Long Press Support */}
        <div 
          ref={imageContainerRef}
          className="relative w-full h-48 xs:h-52 sm:h-56 bg-gray-50"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => {
            e.preventDefault()
            handleLongPressDownload()
          }}
        >
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
          
          {/* Long Press Hint (appears briefly) */}
          {showLongPressMenu && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
              <div className="bg-white rounded-xl shadow-xl p-2 animate-pulse">
                <p className="text-xs text-gray-500">Release to save</p>
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
                  setShowCommentDrawer(true);
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
        </div>
      </article>

      {/* Long Press Context Menu */}
      {showLongPressMenu && imageUrl && !imageUrl.startsWith('data:') && (
        <div 
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in"
          style={{ 
            top: Math.min(longPressPosition.y, window.innerHeight - 200),
            left: Math.min(longPressPosition.x, window.innerWidth - 180),
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="py-1">
            <button
              onClick={handleLongPressDownload}
              disabled={longPressDownloading}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 min-w-[160px]"
            >
              <Download className="h-4 w-4" />
              {longPressDownloading ? 'Downloading...' : 'Save Image'}
            </button>
            
            <button
              onClick={handleLongPressCopy}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <Copy className="h-4 w-4" />
              {longPressCopied ? 'Copied!' : 'Copy Image'}
            </button>
            
            {typeof navigator.share === 'function' && (
              <button
                onClick={handleLongPressShare}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}
            
            <div className="border-t border-gray-100 my-1" />
            
            <button
              onClick={() => setShowLongPressMenu(false)}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-3"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={showCommentDrawer}
        onClose={() => setShowCommentDrawer(false)}
        postId={article.id}
        postType="news"
        currentUserId={currentUserId || ''}
        onCommentAdded={handleCommentAdded}
      />

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.1s ease-out; }
      `}</style>
    </>
  )
}
