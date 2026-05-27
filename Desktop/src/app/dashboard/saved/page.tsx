// app/dashboard/saved/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, Play, Eye, Trash2 } from 'lucide-react'
import Image from 'next/image'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import Link from 'next/link'

export default function SavedPage() {
  const [savedVideos, setSavedVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSavedVideos()
  }, [])

  const fetchSavedVideos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('saved_videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setSavedVideos(data || [])
    setLoading(false)
  }

  const removeSaved = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('saved_videos')
      .delete()
      .eq('video_id', videoId)
      .eq('user_id', user.id)

    setSavedVideos(prev => prev.filter(v => v.video_id !== videoId))
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-black text-gray-900">Saved Videos</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-t-xl" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : savedVideos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">No saved videos</h3>
            <p className="text-sm text-gray-500">Save videos you like to watch later</p>
            <Link href="/dashboard/updates">
              <button className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium">
                Browse Videos
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedVideos.map((video) => (
              <div key={video.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition">
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={video.video_data?.thumbnail || '/placeholder-video.jpg'}
                    alt={video.video_data?.title || 'Video'}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                    <Play className="h-12 w-12 text-white fill-white" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                    {video.video_data?.title || 'Untitled Video'}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Saved {new Date(video.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => removeSaved(video.video_id)}
                    className="text-red-500 text-sm flex items-center gap-1 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
