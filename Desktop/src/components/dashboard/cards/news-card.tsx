'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Check, ExternalLink } from 'lucide-react'
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
}: {
  article: any
  isLiked: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)

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

  return (
    <article className="bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all duration-150 shadow-sm active:scale-[0.99] w-full">
      {/* Top Section: Large Image */}
      <div className="relative w-full h-48 xs:h-52 sm:h-64 bg-gray-50">
        {imageLoading ? (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        ) : imageUrl ? (
          imageUrl.startsWith('data:') ? (
            // For SVG data URLs, use img tag instead of Next Image
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            // For regular URLs, use Next Image for optimization
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
              priority
              unoptimized
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-gray-500 text-sm">News image</p>
            </div>
          </div>
        )}
        
        {/* Source Badge Overlay */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-black text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full uppercase tracking-wider">
            {sourceName}
          </span>
        </div>
      </div>

      {/* Bottom Section: Text & Actions */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-[15px] xs:text-base font-bold text-gray-900 leading-tight line-clamp-2 mb-2">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
            <span>{timeAgo(article.publishedAt || article.created_at)} ago</span>
            {article.url && (
               <>
                 <span>•</span>
                 <a href={article.url} target="_blank" className="text-orange-500 font-bold flex items-center gap-0.5">
                   Read <ExternalLink className="h-2.5 w-2.5" />
                 </a>
               </>
            )}
          </div>
        </div>

        {/* Action bar - FIXED: Grouped together, NOT justify-between */}
        <div className="flex items-center gap-5 pt-3 border-t border-gray-50">
          <button
            onClick={(e) => { e.preventDefault(); onLike(); }}
            className={`flex items-center gap-1.5 transition ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
            <span className="text-[12px] font-bold">Like</span>
          </button>

          <button
            onClick={(e) => { e.preventDefault(); onComment(); }}
            className="flex items-center gap-1.5 text-gray-500 transition"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-[12px] font-bold">{commentCount > 0 ? commentCount : 'Comment'}</span>
          </button>

          <button
            onClick={(e) => { e.preventDefault(); onShare(); }}
            className={`flex items-center gap-1.5 transition ${
              shareCopied ? 'text-green-500' : 'text-gray-500'
            }`}
          >
            {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span className="text-[12px] font-bold">Share</span>
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Trending Section Wrapper ────────────────────────────────────────────────

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
  onToggleAll
}: any) {
  const safeArticles = Array.isArray(articles) ? articles : []
  const visible = showAll ? safeArticles : safeArticles.slice(0, 4)

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
        {visible.map((article: any) => (
          <MainNewsCard
            key={article.id}
            article={article}
            isLiked={likedNews.has(article.id)}
            commentCount={commentCounts[article.id] || 0}
            shareCopied={shareCopied === article.id}
            onLike={() => onLike(article.id)}
            onComment={() => onComment(article)}
            onShare={() => onShare(article)}
          />
        ))}
      </div>
    </section>
  )
}
