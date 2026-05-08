'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Story {
  id: string
  media_url: string
  caption?: string | null
  created_at: string
}

export default function StoryViewer({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const supabase = createClient()
  const [stories, setStories] = useState<Story[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('stories')
      .select('id, media_url, caption, created_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Story fetch error:', error)
        }
        setStories(data || [])
        setLoading(false)
      })
  }, [userId, supabase])

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  // Auto-advance after 5 seconds
  useEffect(() => {
    if (stories.length === 0) return
    const timer = setTimeout(goNext, 5000)
    return () => clearTimeout(timer)
  }, [currentIndex, stories, goNext])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-orange-500 rounded-full" />
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <p className="mb-4">No stories available</p>
        <button onClick={onClose} className="px-4 py-2 rounded-full bg-white/20">
          Close
        </button>
      </div>
    )
  }

  const current = stories[currentIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Progress bar */}
      <div className="absolute top-0 left-4 right-4 flex gap-1 pt-2 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{
                width:
                  idx < currentIndex
                    ? '100%'
                    : idx === currentIndex
                    ? `${((currentIndex + 1) / stories.length) * 100}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center" onClick={goNext}>
        {current.media_url.endsWith('.mp4') || current.media_url.includes('video') ? (
          <video
            src={current.media_url}
            className="max-h-full max-w-full object-contain"
            autoPlay
            muted
            onEnded={goNext}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <img
            src={current.media_url}
            className="max-h-full max-w-full object-contain"
            alt="story"
          />
        )}

        {/* Caption overlay */}
        {current.caption && (
          <div className="absolute bottom-8 left-4 right-4 text-center text-white text-sm font-medium bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2">
            {current.caption}
          </div>
        )}
      </div>
    </div>
  )
}