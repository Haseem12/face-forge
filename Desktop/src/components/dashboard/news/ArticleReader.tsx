'use client'

import { useEffect, useState } from 'react'
import { 
  Bookmark, Share2, ChevronLeft, ChevronRight, 
  Heart, MessageCircle, Eye, Clock, ArrowLeft, Check,
  X, ExternalLink, Copy, Twitter
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
  const [showShareMenu, setShowShareMenu] = useState(false)
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
            setFullContent(
              cleaned +
              '\n\n' +
              `This is a preview. Read the full article on ${article.source?.name} for complete coverage.`
            )
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
  }, [article.url, article.content, article.description, article.source?.name])

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
      setShowShareMenu(false)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(article.url)}`,
      '_blank'
    )
    setShowShareMenu(false)
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
      {/* Browser-style Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        {/* Browser URL Bar */}
        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-1 ml-2">
              {hasPrevious && onPrevious && (
                <button onClick={onPrevious} className="p-1 rounded hover:bg-gray-200 transition">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {hasNext && onNext && (
                <button onClick={onNext} className="p-1 rounded hover:bg-gray-200 transition">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          {/* URL Bar */}
          <div className="flex-1 max-w-2xl mx-4">
            <div className="bg-white rounded-lg px-3 py-1.5 text-sm text-gray-500 truncate border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
                <span className="truncate">{article.url?.replace(/^https?:\/\//, '').split('/')[0]}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">🔒</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(article.url, '_blank')}
              className="p-2 rounded-full hover:bg-gray-200 transition text-gray-600"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 transition text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Article Navigation Bar */}
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-500 hover:text-orange-500 text-sm font-medium transition">
                ← Back to Feed
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-400">
                {article.source?.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-2 rounded-full transition ${isSaved ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100 text-gray-600'}`}
                title={isSaved ? 'Saved' : 'Save'}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-orange-500' : ''}`} />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600"
                  title="Share"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-fade-in">
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" /> Copy link
                    </button>
                    <button
                      onClick={shareOnTwitter}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Twitter className="h-4 w-4 text-blue-500" /> Share on X
                    </button>
                    <button
                      onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(article.url)}`, '_blank')}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                      Share on Facebook
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content - Clean Browser Style */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        {/* Header Image - From News Card */}
        {article.urlToImage && !imageError && (
          <div className="relative rounded-xl overflow-hidden mb-8 shadow-lg bg-gray-100">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
          {article.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
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
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                localLiked 
                  ? 'bg-red-50 text-red-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${localLiked ? 'fill-red-500' : ''}`} />
              <span className="text-xs font-medium">Like</span>
            </button>
            <button
              onClick={handleComment}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
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
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-4/5" />
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-3/4" />
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            {fullContent ? (
              formatContent(fullContent)
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <div className="text-6xl mb-4">📄</div>
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

        {/* Original Source Link */}
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

      {/* Bottom Action Bar - Floating */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-full py-2 px-4 shadow-xl z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              localLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${localLiked ? 'fill-red-500' : ''}`} />
            <span className="text-xs font-medium">Like</span>
          </button>
          
          <button
            onClick={handleComment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-600 hover:text-blue-500 transition"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Comment</span>
          </button>

          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              isSaved ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-orange-500' : ''}`} />
            <span className="text-xs font-medium">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-600 hover:text-green-500 transition"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs font-medium">Share</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        
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
