'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, Bookmark, Share2, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import Image from 'next/image'

interface ArticleReaderProps {
  article: {
    id: string
    title: string
    description?: string
    url: string
    urlToImage?: string
    source: { name: string }
    publishedAt: string
  }
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
}

export default function ArticleReader({ 
  article, 
  onClose, 
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious 
}: ArticleReaderProps) {
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [article.id])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          <div className="flex items-center gap-1">
            {hasPrevious && onPrevious && (
              <button
                onClick={onPrevious}
                className="p-2 rounded-full hover:bg-gray-800 transition"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {hasNext && onNext && (
              <button
                onClick={onNext}
                className="p-2 rounded-full hover:bg-gray-800 transition"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="p-2 rounded-full hover:bg-gray-800 transition"
            >
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
            </button>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-gray-800 transition"
            >
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
          {/* Hero Image */}
          {article.urlToImage && (
            <div className="relative rounded-2xl overflow-hidden mb-6">
              <Image
                src={article.urlToImage}
                alt={article.title}
                width={800}
                height={400}
                className="w-full object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-800">
            <span className="font-medium text-orange-400">{article.source?.name}</span>
            <span>•</span>
            <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}</span>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-3/4" />
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-full" />
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-5/6" />
              <div className="h-4 bg-gray-800 rounded-full animate-pulse w-2/3" />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed text-base">
                {article.description || 'Full article content would appear here. This is a preview of the article. Click the external link button to read the complete article on the original source website.'}
              </p>
              
              <div className="mt-8 p-4 bg-gray-900/50 rounded-xl text-center">
                <p className="text-gray-400 text-sm mb-3">
                  Want to read the full article?
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium transition"
                >
                  Continue reading on {article.source?.name}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}