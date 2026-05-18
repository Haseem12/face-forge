'use client'

import { useEffect, useState } from 'react'
import { 
  Bookmark, Share2, ChevronLeft, ChevronRight, 
  Heart, MessageCircle, Clock, ArrowLeft, Check,
  X, ExternalLink, Copy
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ArticleReaderProps {
  article: {
    id: string
    title: string
    description?: string
    url: string
    urlToImage?: string
    source: { name: string; url?: string }
    publishedAt: string
    content?: string
    author?: string
  }
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  isLiked?: boolean
  commentCount?: number
  onLike?: () => void
  onComment?: () => void
}

// Strip all HTML tags and decode entities
function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ArticleReader({ 
  article, 
  onClose, 
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious,
  isLiked = false,
  commentCount = 0,
  onLike,
  onComment
}: ArticleReaderProps) {
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [fullContent, setFullContent] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleLike = () => {
    setLocalLiked(prev => !prev)
    onLike?.()
  }

  const handleComment = () => {
    setShowCommentInput(prev => !prev)
    onComment?.()
  }

  const submitComment = () => {
    if (!commentText.trim()) return
    setLocalCommentCount(prev => prev + 1)
    setCommentText('')
    setShowCommentInput(false)
  }

  useEffect(() => {
    setLoading(true)
    setFullContent('')
    setShowCommentInput(false)
    setImageLoaded(false)
    setImageError(false)

    const fetchFullContent = async () => {
      try {
        const response = await fetch(`/api/article-content?url=${encodeURIComponent(article.url)}`)
        if (response.ok) {
          const data = await response.json()
          const cleaned = stripHtml(data.content || '')
          if (cleaned.length > 200) {
            setFullContent(cleaned)
            setLoading(false)
            return
          }
        }

        if (article.content && article.content.length > 100) {
          const cleaned = stripHtml(article.content)
          if (cleaned.length > 100) {
            setFullContent(cleaned)
            setLoading(false)
            return
          }
        }

        if (article.description) {
          const cleaned = stripHtml(article.description)
          if (cleaned.length > 30) {
            setFullContent(cleaned)
            setLoading(false)
            return
          }
        }

        setFullContent('')
      } catch (error) {
        console.error('Failed to fetch full content:', error)
        const fallback = article.description ? stripHtml(article.description) : ''
        setFullContent(fallback)
      } finally {
        setLoading(false)
      }
    }

    fetchFullContent()
  }, [article.url, article.content, article.description])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(article.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatContent = (content: string) => {
    if (!content) return null
    const clean = content.includes('<') ? stripHtml(content) : content
    const paragraphs = clean.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    if (paragraphs.length === 0) return (
      <p className="text-gray-700 leading-relaxed mb-5 text-base md:text-lg">{clean}</p>
    )

    return paragraphs.map((para, idx) => (
      <p key={idx} className="text-gray-700 leading-relaxed mb-5 text-base md:text-lg">
        {para.trim()}
      </p>
    ))
  }

  const readingTime = Math.max(1, Math.ceil((fullContent.split(/\s+/).length || 100) / 200))

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Simple Header - Just back button and actions */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              {hasPrevious && onPrevious && (
                <button onClick={onPrevious} className="p-2 rounded-full hover:bg-gray-100 transition">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              {hasNext && onNext && (
                <button onClick={onNext} className="p-2 rounded-full hover:bg-gray-100 transition">
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-2 rounded-full transition ${isSaved ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-orange-500' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        {/* Header Image */}
        {article.urlToImage && !imageError && (
          <div className="relative rounded-xl overflow-hidden mb-8 bg-gray-100 shadow-md">
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}
              <Image
                src={article.urlToImage}
                alt={article.title}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                unoptimized
                priority
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {article.source?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{article.source?.name}</div>
              <div className="text-xs flex items-center gap-2">
                <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })}</span>
                <span>•</span>
                <span>{readingTime} min read</span>
                {article.author && (
                  <>
                    <span>•</span>
                    <span>By {article.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition ${localLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart className={`h-4 w-4 ${localLiked ? 'fill-red-500' : ''}`} />
              <span className="text-xs font-medium">Like</span>
            </button>
            <button
              onClick={handleComment}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{localCommentCount} Comments</span>
            </button>
          </div>
        </div>

        {/* Comment Input */}
        {showCommentInput && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full resize-none bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowCommentInput(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition"
              >
                Post Comment
              </button>
            </div>
          </div>
        )}

        {/* Article Body */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-5/6" />
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-2/3" />
            <div className="h-32 bg-gray-100 rounded-xl animate-pulse mt-4" />
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            {fullContent ? (
              formatContent(fullContent)
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 font-medium">Content could not be extracted.</p>
                <p className="text-sm text-gray-400 mt-2 mb-6">
                  This site may block previews or require a subscription.
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-orange-600 transition"
                >
                  Read on {article.source?.name}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Source Link */}
        {fullContent && (
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium transition"
            >
              Read original article on {article.source?.name}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* End Marker */}
        <div className="mt-12 pt-6 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full mx-auto mb-3" />
          <p className="text-xs text-gray-400">End of article</p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 z-10 shadow-lg">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-around">
            <button
              onClick={handleLike}
              className={`flex flex-col items-center gap-0.5 transition ${localLiked ? 'text-red-500' : 'text-gray-500'}`}
            >
              <Heart className={`h-5 w-5 ${localLiked ? 'fill-red-500' : ''}`} />
              <span className="text-[10px]">Like</span>
            </button>
            
            <button
              onClick={handleComment}
              className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px]">Comment</span>
            </button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex flex-col items-center gap-0.5 transition ${isSaved ? 'text-orange-500' : 'text-gray-500'}`}
            >
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-orange-500' : ''}`} />
              <span className="text-[10px]">{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-green-500 transition"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
              <span className="text-[10px]">{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .prose {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 1.125rem;
          line-height: 1.75;
          color: #1f2937;
        }
        .prose p {
          margin-bottom: 1.5rem;
        }
        .prose h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #111827;
        }
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #1f2937;
        }
        .prose blockquote {
          border-left: 4px solid #f97316;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #4b5563;
        }
        .prose ul, .prose ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        .prose li {
          margin: 0.25rem 0;
        }
        .prose a {
          color: #f97316;
          text-decoration: none;
        }
        .prose a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
