'use client'

import { useEffect, useState } from 'react'
import { 
  Bookmark, Share2, ChevronLeft, ChevronRight, 
  Heart, MessageCircle, Eye, Clock, ArrowLeft, Check
} from 'lucide-react'
import Image from 'next/image'

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

  // Fix 3: local like/comment state as fallback when parent doesn't manage it
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')

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

    const fetchFullContent = async () => {
      try {
        // Method 1: API route with cheerio scraper
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

        // Method 2: RSS content field (often has real paragraphs)
        if (article.content && article.content.length > 100) {
          const cleaned = stripHtml(article.content)
          if (cleaned.length > 100) {
            setFullContent(cleaned)
            setLoading(false)
            return
          }
        }

        // Method 3: Description fallback
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

        // Method 4: honest failure — don't fabricate content
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
  }, [article.url]) // only url — that's what identifies a new article

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

  // Fix 1: always strip HTML before rendering, split into paragraphs
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

  const readingTime = Math.max(1, Math.ceil(fullContent.split(/\s+/).length / 200))

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/98 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-1">
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
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-fade-in">
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" /> Copy link
                    </button>
                    
                     href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(article.url)}&text=${encodeURIComponent(article.title)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
>
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
  Share on X
</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-40">
        {article.urlToImage && (
          <div className="relative rounded-2xl overflow-hidden mb-8 shadow-xl">
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={article.urlToImage}
                alt={article.title}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        )}

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 leading-tight">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {article.source?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{article.source?.name}</div>
              <div className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(article.publishedAt).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition ${localLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart className={`h-4 w-4 ${localLiked ? 'fill-red-500' : ''}`} />
              <span className="text-xs font-medium">{localLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              onClick={handleComment}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{localCommentCount} comments</span>
            </button>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">{readingTime} min read</span>
            </div>
          </div>
        </div>

        {/* Comment input box */}
        {showCommentInput && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full resize-none bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowCommentInput(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* Article Content */}
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
            {fullContent ? formatContent(fullContent) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 font-medium">Content could not be extracted.</p>
                <p className="text-sm text-gray-400 mt-2 mb-4">
                  This site may block previews or require a subscription.
                </p>
                
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-orange-600 transition"
                >
                  Read on {article.source?.name}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Source link */}
        {fullContent && (
          <div className="mt-8 text-center">
            
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium"
            >
              Read original article on {article.source?.name}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-400">End of article</p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 py-3 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 transition ${localLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
              >
                <Heart className={`h-5 w-5 ${localLiked ? 'fill-red-500' : ''}`} />
                <span className="text-sm font-medium">{localLiked ? 'Liked' : 'Like'}</span>
              </button>
              
              <button
                onClick={handleComment}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {localCommentCount > 0 ? `${localCommentCount} comments` : 'Comment'}
                </span>
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-2 transition ${isSaved ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-orange-500' : ''}`} />
                <span className="text-sm font-medium">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <div className="text-xs text-gray-400">
              {readingTime} min read
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        .prose { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .prose p { margin-bottom: 1.5rem; line-height: 1.7; }
        .prose h2, .prose h3 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 700; color: #1f2937; }
        .prose ul, .prose ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
        .prose li { margin-bottom: 0.5rem; }
      `}</style>
    </div>
  )
}
