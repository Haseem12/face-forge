// app/create-fleex/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  X, Music, Camera, Upload, Trash2, Sparkles, 
  Loader2, Video, Check, ArrowLeft, Plus,
  Scissors, Volume2, VolumeX, Play, Pause
} from 'lucide-react'

export default function CreateFleexPage() {
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('Original Sound')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (videoRef.current && videoPreview) {
      videoRef.current.play().catch(e => console.log('Play error:', e))
    }
  }, [videoPreview])

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, MOV, etc.)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be less than 50MB')
      return
    }

    setVideo(file)
    const preview = URL.createObjectURL(file)
    setVideoPreview(preview)

    const videoElement = document.createElement('video')
    videoElement.preload = 'metadata'
    videoElement.onloadedmetadata = () => {
      const durationInSeconds = Math.floor(videoElement.duration)
      setDuration(durationInSeconds)
    }
    videoElement.src = preview
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.currentTime = 1
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

      const fileExt = video.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('fleex_videos')
        .upload(fileName, video)

      if (uploadError) throw uploadError

      setUploadProgress(50)

      const { data: { publicUrl } } = supabase.storage
        .from('fleex_videos')
        .getPublicUrl(fileName)

      setUploadProgress(70)

      let thumbnailUrl = null
      if (videoPreview) {
        try {
          thumbnailUrl = await generateThumbnail(videoPreview)
        } catch (thumbError) {
          console.warn('Thumbnail generation failed:', thumbError)
        }
      }

      setUploadProgress(90)

      const durationInt = Math.floor(duration)
      
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

      if (dbError) throw dbError

      setUploadProgress(100)
      router.push('/fleex')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Failed to upload fleex. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => router.back()} 
          className="text-white w-10 h-10 rounded-full bg-black/50 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5" />
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
            {/* Video Player */}
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoPreview}
                className="w-full aspect-[9/16] object-cover"
                loop
                muted={isMuted}
                playsInline
                onClick={togglePlay}
              />
              
              {/* Play/Pause Overlay */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition"
              >
                {isPlaying ? (
                  <Pause className="h-12 w-12 text-white" />
                ) : (
                  <Play className="h-12 w-12 text-white" />
                )}
              </button>
              
              {/* Duration Badge */}
              {duration > 0 && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-lg text-white text-xs">
                  {formatDuration(duration)}
                </div>
              )}
              
              {/* Sound Toggle */}
              <button
                onClick={toggleMute}
                className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
              </button>
            </div>
            
            {/* Clear Button */}
            <button
              onClick={() => {
                setVideo(null)
                setVideoPreview(null)
                setDuration(0)
                if (videoPreview) URL.revokeObjectURL(videoPreview)
              }}
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
