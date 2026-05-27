// app/create-reel/page.tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Music, Camera, Upload, Trash2, Check } from 'lucide-react'

export default function CreateReelPage() {
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('Original Sound')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be less than 50MB')
      return
    }

    setVideo(file)
    const preview = URL.createObjectURL(file)
    setVideoPreview(preview)

    // Get video duration
    const videoElement = document.createElement('video')
    videoElement.preload = 'metadata'
    videoElement.onloadedmetadata = () => {
      setDuration(videoElement.duration)
    }
    videoElement.src = preview
  }

  const uploadVideo = async () => {
    if (!video) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload video to storage
      const fileExt = video.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('user_videos')
        .upload(fileName, video)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_videos')
        .getPublicUrl(fileName)

      // Generate thumbnail (first frame)
      const thumbnailUrl = await generateThumbnail(videoPreview!)

      // Save to database
      const { error: dbError } = await supabase
        .from('user_videos')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          caption: caption || null,
          music_name: musicName,
          duration: duration
        })

      if (dbError) throw dbError

      router.push('/updates')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload video')
    } finally {
      setUploading(false)
    }
  }

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.currentTime = 1
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL())
      }
      video.src = videoUrl
    })
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => router.back()} className="text-white">
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-white font-bold text-lg">Create Reel</h1>
        <button
          onClick={uploadVideo}
          disabled={!video || uploading}
          className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-bold disabled:opacity-50"
        >
          {uploading ? 'Posting...' : 'Post'}
        </button>
      </div>

      {/* Video Preview */}
      <div className="h-full flex flex-col items-center justify-center pt-16 pb-20">
        {videoPreview ? (
          <div className="relative w-full max-w-md mx-auto">
            <video
              ref={videoRef}
              src={videoPreview}
              className="w-full rounded-2xl"
              controls
              autoPlay
              loop
            />
            <button
              onClick={() => {
                setVideo(null)
                setVideoPreview(null)
              }}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-2"
          >
            <Camera className="h-8 w-8 text-white" />
            <span className="text-white text-xs">Select Video</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSelect}
          className="hidden"
        />

        {/* Caption Input */}
        {videoPreview && (
          <div className="w-full max-w-md mt-4 space-y-3">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-4 py-2 bg-white/10 rounded-xl text-white placeholder-white/50 resize-none"
              rows={2}
            />
            
            {/* Music Selection */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl">
              <Music className="h-4 w-4 text-white/70" />
              <input
                type="text"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none"
                placeholder="Add music"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
