// app/create-fleex/page.tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Music, Camera, Trash2, Sparkles, Loader2 } from 'lucide-react'

export default function CreateFleexPage() {
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('Original Sound')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, MOV, etc.)')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be less than 50MB')
      return
    }

    setVideo(file)
    const preview = URL.createObjectURL(file)
    setVideoPreview(preview)

    // Get video duration and convert to integer seconds
    const videoElement = document.createElement('video')
    videoElement.preload = 'metadata'
    videoElement.onloadedmetadata = () => {
      // Convert float duration to integer (floor)
      const durationInSeconds = Math.floor(videoElement.duration)
      setDuration(durationInSeconds)
      console.log('Video duration (seconds):', durationInSeconds)
    }
    videoElement.src = preview
  }

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.currentTime = 1 // Take frame at 1 second
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL())
        } else {
          reject(new Error('Could not create canvas context'))
        }
      }
      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = videoUrl
    })
  }

  const uploadVideo = async () => {
    if (!video) {
      alert('Please select a video first')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated. Please log in again.')
      }

      // Create unique filename
      const fileExt = video.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      // Upload to storage with progress simulation
      const { error: uploadError } = await supabase.storage
        .from('fleex_videos')
        .upload(fileName, video)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      setUploadProgress(50)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fleex_videos')
        .getPublicUrl(fileName)

      setUploadProgress(70)

      // Generate thumbnail from preview
      let thumbnailUrl = null
      if (videoPreview) {
        try {
          thumbnailUrl = await generateThumbnail(videoPreview)
        } catch (thumbError) {
          console.warn('Thumbnail generation failed:', thumbError)
          // Continue without thumbnail
        }
      }

      setUploadProgress(90)

      // Save to database - ensure duration is integer
      const durationInt = Math.floor(duration) // Double ensure it's integer
      
      const { error: dbError } = await supabase
        .from('user_fleex')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          caption: caption.trim() || null,
          music_name: musicName || 'Original Sound',
          duration: durationInt,
          is_private: false
        })

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      setUploadProgress(100)
      
      // Success - navigate to fleex feed
      router.push('/fleex')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Failed to upload fleex. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const clearVideo = () => {
    setVideo(null)
    setVideoPreview(null)
    setDuration(0)
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => router.back()} 
          className="text-white w-10 h-10 rounded-full bg-black/50 flex items-center justify-center active:scale-95 transition"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-1">
          <span className="text-white font-bold text-lg">Create</span>
          <span className="text-orange-500 font-bold text-lg">Fleex</span>
        </div>
        
        <button
          onClick={uploadVideo}
          disabled={!video || uploading}
          className="px-5 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Posting...</span>
            </div>
          ) : (
            'Post'
          )}
        </button>
      </div>

      {/* Upload Progress Bar */}
      {uploading && uploadProgress > 0 && (
        <div className="fixed top-16 left-0 right-0 z-20 h-1 bg-white/20">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="h-full flex flex-col items-center justify-center pt-16 pb-20 px-4">
        {videoPreview ? (
          <div className="relative w-full max-w-md mx-auto">
            {/* Video Preview */}
            <video
              ref={videoRef}
              src={videoPreview}
              className="w-full rounded-2xl shadow-2xl"
              controls
              autoPlay
              loop
              playsInline
            />
            
            {/* Duration Badge */}
            {duration > 0 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-lg text-white text-xs">
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </div>
            )}
            
            {/* Clear Button */}
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          // Upload Button
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition active:scale-95"
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

        {/* Caption & Music Inputs */}
        {videoPreview && (
          <div className="w-full max-w-md mt-6 space-y-3">
            {/* Caption */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
              maxLength={150}
            />
            <div className="text-right text-xs text-white/30">
              {caption.length}/150
            </div>
            
            {/* Music Selection */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-xl">
              <Music className="h-4 w-4 text-white/70" />
              <input
                type="text"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none"
                placeholder="Add music (optional)"
                maxLength={50}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tips Footer */}
      {!videoPreview && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
            <Sparkles className="h-3 w-3" />
            <span>Upload vertical videos (9:16) for best results</span>
            <Sparkles className="h-3 w-3" />
          </div>
        </div>
      )}
    </div>
  )
}
