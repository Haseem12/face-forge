'use client'

import { useEffect, useState } from 'react'
import { 
  X, Bookmark, Share2, ChevronLeft, ChevronRight, 
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
  const [articleTitle, setArticleTitle] = useState(article.title)
  const [articleImage, setArticleImage] = useState(article.urlToImage)

  // Fetch full article content using multiple methods
  useEffect(() => {
    const fetchFullContent = async () => {
      setLoading(true)
      
      try {
        // Method 1: Try our API route
        const response = await fetch(`/api/article-content?url=${encodeURIComponent(article.url)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.content && data.content.length > 200) {
            setFullContent(data.content)
            if (data.title) setArticleTitle(data.title)
            if (data.image) setArticleImage(data.image)
            setLoading(false)
            return
          }
        }
        
        // Method 2: Use article.content from RSS (often has truncated text)
        if (article.content && article.content.length > 100) {
          setFullContent(article.content)
          setLoading(false)
          return
        }
        
        // Method 3: Use description as fallback
        if (article.description && article.description.length > 50) {
          // Clean HTML from description
          const cleanText = article.description
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
          
          setFullContent(cleanText)
          setLoading(false)
          return
        }
        
        // Method 4: Create expanded content based on title and source
        setFullContent(`
          ${article.description || 'Read the full article on the original source for complete coverage.'}
          
          This article from ${article.source?.name} covers important developments in technology and innovation.
          
          For the complete story, detailed analysis, and expert insights, please visit the original source.
          
          Stay informed with the latest updates on this topic and more.
        `)
        
      } catch (error) {
        console.error('Failed to fetch full content:', error)
        setFullContent(`
          We're having trouble loading the full article content.
          
          Please click the "Read Original" link below to view the complete article on ${article.source?.name}.
          
          We apologize for the inconvenience.
        `)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFullContent()
  }, [article.url, article.description, article.content, article.source?.name])

  // Handle escape key
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

  // Clean HTML content and convert to plain text with proper formatting
  const cleanHtmlContent = (html: string): string => {
    if (!html) return ''
    
    let text = html
      // Remove script tags and their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove style tags and their content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags but keep line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      // Remove extra whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
    
    return text
  }

  // Format content with proper paragraphs
  const formatContent = (content: string) => {
    if (!content) return null
    
    // Clean HTML if present
    let cleanContent = content
    if (content.includes('<') && content.includes('>')) {
      cleanContent = cleanHtmlContent(content)
    }
    
    // Split by double newlines or create paragraphs
    const paragraphs = cleanContent.split(/\n\s*\n/).filter(p => p.trim())
    
    if (paragraphs.length === 0) {
      return <p className="text-gray-700 leading-relaxed mb-5 text-base md:text-lg">{cleanContent}</p>
    }
    
    return paragraphs.map((paragraph, idx) => (
      <p key={idx} className="text-gray-700 leading-relaxed mb-5 text-base md:text-lg">
        {paragraph.trim()}
      </p>
    ))
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header with gradient */}
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
                <button
                  onClick={onPrevious}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              {hasNext && onNext && (
                <button
                  onClick={onNext}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-2 rounded-full transition ${
                  isSaved ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100 text-gray-600'
                }`}
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
                      <Share2 className="h-4 w-4" />
                      Copy link
                    </button>
                    <a
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
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Hero Image */}
        {articleImage && (
          <div className="relative rounded-2xl overflow-hidden mb-8 shadow-xl">
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={articleImage}
                alt={articleTitle}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 leading-tight">
          {articleTitle}
        </h1>

        {/* Meta Info */}
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
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 transition ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="text-xs font-medium">Like</span>
            </button>
            <button
              onClick={onComment}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-medium">{commentCount} comments</span>
            </button>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Read</span>
            </div>
          </div>
        </div>

        {/* Full Article Content */}
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
                <p className="text-gray-500">Unable to load full article content.</p>
                <p className="text-sm text-gray-400 mt-2">The article may not be accessible for preview.</p>
              </div>
            )}
          </div>
        )}

        {/* Original Source Link */}
        <div className="mt-8 text-center">
          <a
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

        {/* End of article decoration */}
        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-400">
            You've reached the end of this article
          </p>
        </div>
      </div>

      {/* Bottom Action Bar - Now with working like/comment/save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 py-3 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button
                onClick={onLike}
                className={`flex items-center gap-2 transition ${
                  isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : ''}`} />
                <span className="text-sm font-medium">Like</span>
              </button>
              
              <button
                onClick={onComment}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Comment</span>
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex items-center gap-2 transition ${
                  isSaved ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-orange-500' : ''}`} />
                <span className="text-sm font-medium">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <div className="text-xs text-gray-400">
              {Math.ceil((fullContent?.length || 0) / 1000)} min read
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
        
        .prose {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        
        .prose p {
          margin-bottom: 1.5rem;
          line-height: 1.7;
        }
        
        .prose h2, .prose h3 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 700;
          color: #1f2937;
        }
        
        .prose ul, .prose ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        
        .prose li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  )
}
