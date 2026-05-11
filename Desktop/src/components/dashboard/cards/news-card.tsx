'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Check, ExternalLink, MoreHorizontal, Copy, Download, Eye } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getArticleImage } from '@/lib/dashboard/image-helper'

export default function MainNewsCard({
  article,
  isLiked,
  commentCount,
  shareCopied,
  onLike,
  onComment,
  onShare,
  onReadInside,
}: {
  article: any
  isLiked: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onReadInside: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = article.caption || article.title || "Untitled"
  const sourceName = article.source?.name || "Tech Feed"
  const originalImage = article.media_url || article.urlToImage

  // Load image on mount/when article changes
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

  return (
<article className="bg-white rounded-md border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md w-full group">
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

        {/* Action bar - Social media style */}
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
              onClick={(e) => { e.preventDefault(); onComment(); }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-[12px] font-bold">{commentCount > 0 ? commentCount : 'Comment'}</span>
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
  )
}

// ─── Trending Section Wrapper with Infinite Scroll ─────────────────────────

export function TrendingNewsSection({
  articles = [],
  likedNews = new Set(),
  commentCounts = {},
  shareCopied = null,
  showAll = false,
  loading = false,
  onLike,
  onComment,
  onShare,
  onToggleAll,
  onReadInside
}: any) {
  const safeArticles = Array.isArray(articles) ? articles : []
  const [displayedCount, setDisplayedCount] = useState(4)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const visible = showAll ? safeArticles : safeArticles.slice(0, displayedCount)
  const hasMore = !showAll && displayedCount < safeArticles.length

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
          setIsLoadingMore(true)
          setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + 3, safeArticles.length))
            setIsLoadingMore(false)
          }, 500)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, isLoadingMore, safeArticles.length])

  // Reset displayed count when articles change or showAll toggles
  useEffect(() => {
    setDisplayedCount(4)
  }, [articles, showAll])

  return (
    <section className="px-3 xs:px-4 py-2 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-500 to-pink-500" />
          <h2 className="text-base xs:text-lg font-black text-gray-900 tracking-tight">Trending</h2>
        </div>
        {!loading && safeArticles.length > 4 && (
          <button onClick={onToggleAll} className="text-xs xs:text-sm font-bold text-orange-500 hover:text-orange-600 transition">
            {showAll ? 'Show less' : 'See all'}
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {visible.map((article: any, idx: number) => (
          <MainNewsCard
            key={article.id}
            article={article}
            isLiked={likedNews.has(article.id)}
            commentCount={commentCounts[article.id] || 0}
            shareCopied={shareCopied === article.id}
            onLike={() => onLike(article.id)}
            onComment={() => onComment(article)}
            onShare={() => onShare(article)}
            onReadInside={() => onReadInside(article, idx)}
          />
        ))}
        
        {/* Loading indicator and observer target */}
        {!showAll && hasMore && !loading && (
          <div ref={observerTarget} className="flex justify-center py-4">
            {isLoadingMore ? (
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="text-xs text-gray-400">Scroll for more</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}