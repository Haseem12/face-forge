'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface Story {
  id: string
  media_url: string
  caption?: string | null
  created_at: string
  profiles?: {
    display_name: string
    avatar_url: string
    username: string
  }
}

export default function StoryViewer({
  userId, // This is the ID of the person whose story we clicked
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

    const fetchStories = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id, 
          media_url, 
          caption, 
          created_at,
          profiles:user_id (display_name, avatar_url, username)
        `)
        .eq('user_id', userId) // Filters specifically for the person you clicked
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })

      if (error) console.error('Story fetch error:', error)
      setStories(data || [])
      setLoading(false)
    }

    fetchStories()
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

  // Timer logic
  useEffect(() => {
    if (stories.length === 0 || loading) return
    const timer = setTimeout(goNext, 5000)
    return () => clearTimeout(timer)
  }, [currentIndex, stories, goNext, loading])

  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-white border-t-orange-500 rounded-full" />
    </div>
  )

  if (stories.length === 0) return null

  const current = stories[currentIndex]
  const profile = current.profiles

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-3xl overflow-hidden bg-zinc-900">
        
        {/* Header: Profile Info */}
        <div className="absolute top-6 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-orange-500 overflow-hidden relative">
              <Image 
                src={profile?.avatar_url || 'https://github.com/shadcn.png'} 
                alt="Avatar" 
                fill 
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-sm font-bold shadow-black drop-shadow-md">
                {profile?.display_name || 'User'}
              </span>
              <span className="text-white/60 text-[10px]">
                {new Date(current.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="text-white/80 hover:text-white p-2">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Segments */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white transition-all ${idx === currentIndex ? 'duration-[5000ms] linear' : ''}`}
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                  transitionProperty: idx === currentIndex ? 'width' : 'none'
                }}
              />
            </div>
          ))}
        </div>

        {/* Media Content */}
        <div className="w-full h-full flex items-center justify-center select-none" onClick={goNext}>
          {current.media_url.match(/\.(mp4|webm|ogg)$/) ? (
            <video
              src={current.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={goNext}
            />
          ) : (
            <Image
              src={current.media_url}
              alt="story"
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Navigation Areas (Invisible tap zones) */}
        <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={(e) => { e.stopPropagation(); goPrev(); }} />
        <div className="absolute inset-y-0 right-0 w-3/4 z-10" onClick={(e) => { e.stopPropagation(); goNext(); }} />

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-10 left-4 right-4 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-white text-sm text-center">{current.caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}