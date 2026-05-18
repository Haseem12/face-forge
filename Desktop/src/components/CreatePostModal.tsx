'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  X, Image as ImageIcon, Video, Send, Loader2, 
  MapPin, Smile, AtSign, Heart, ThumbsUp, 
  Frown, Meh, Zap, Coffee, PartyPopper, 
  Trash2, Sparkles, XCircle, CheckCircle
} from 'lucide-react'

const FEELINGS = [
  { emoji: '😊', label: 'Happy', icon: Smile, color: 'text-yellow-500' },
  { emoji: '❤️', label: 'Loving', icon: Heart, color: 'text-red-500' },
  { emoji: '👍', label: 'Grateful', icon: ThumbsUp, color: 'text-blue-500' },
  { emoji: '😢', label: 'Sad', icon: Frown, color: 'text-blue-400' },
  { emoji: '😐', label: 'Okay', icon: Meh, color: 'text-gray-500' },
  { emoji: '⚡', label: 'Excited', icon: Zap, color: 'text-yellow-500' },
  { emoji: '☕', label: 'Chilling', icon: Coffee, color: 'text-amber-600' },
  { emoji: '🎉', label: 'Celebrating', icon: PartyPopper, color: 'text-purple-500' },
]

type PostStatus = 'idle' | 'uploading' | 'success' | 'error'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
  userId: string
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated, userId }: CreatePostModalProps) {
  const supabase = createClient()
  
  const [content, setContent] = useState('')
  const [selectedFeeling, setSelectedFeeling] = useState<typeof FEELINGS[0] | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [postStatus, setPostStatus] = useState<PostStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showFeelingPicker, setShowFeelingPicker] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (textareaRef.current && isOpen) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content, isOpen])

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setContent('')
    setSelectedFeeling(null)
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
    setMediaType(null)
    setPostStatus('idle')
    setStatusMessage('')
    setUploadProgress(0)
    setShowFeelingPicker(false)
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValidImage = type === 'image' && file.type.startsWith('image/')
    const isValidVideo = type === 'video' && file.type.startsWith('video/')
    
    if (!isValidImage && !isValidVideo) {
      setStatusMessage(`Please select a valid ${type} file`)
      setPostStatus('error')
      setTimeout(() => setPostStatus('idle'), 3000)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatusMessage('File size must be less than 50MB')
      setPostStatus('error')
      setTimeout(() => setPostStatus('idle'), 3000)
      return
    }

    setMediaFile(file)
    setMediaType(type)
    setMediaPreview(URL.createObjectURL(file))
  }

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile || !userId) return null
    
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExt = mediaFile.name.split('.').pop()
    const fileName = `${userId}/${timestamp}_${randomString}.${fileExt}`
    const filePath = `feeds/${fileName}`
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('feed-media')
        .upload(filePath, mediaFile, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw new Error(uploadError.message)
      
      const { data: { publicUrl } } = supabase.storage
        .from('feed-media')
        .getPublicUrl(filePath)
      
      return publicUrl
      
    } catch (err) {
      console.error('Upload error:', err)
      throw err
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      setStatusMessage('Please write something or add media')
      setPostStatus('error')
      setTimeout(() => setPostStatus('idle'), 3000)
      return
    }
    
    // Start uploading
    setPostStatus('uploading')
    setStatusMessage('Preparing your post...')
    setUploadProgress(10)
    
    try {
      let mediaUrl = null
      if (mediaFile) {
        setStatusMessage('Uploading media...')
        setUploadProgress(30)
        mediaUrl = await uploadMedia()
        setUploadProgress(70)
        if (!mediaUrl) throw new Error('Failed to upload media')
      }
      
      setStatusMessage('Creating your post...')
      setUploadProgress(85)
      
      // Build post content with feeling if selected
      let finalContent = content
      if (selectedFeeling) {
        finalContent = `Feeling ${selectedFeeling.label} ${selectedFeeling.emoji}\n\n${content}`
      }
      
      const { data, error: insertError } = await supabase
        .from('user_feeds')
        .insert({
          user_id: userId,
          content: finalContent.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          feeling: selectedFeeling?.label,
          feeling_emoji: selectedFeeling?.emoji,
          created_at: new Date().toISOString(),
        })
        .select()
      
      if (insertError) throw new Error(insertError.message)
      
      setUploadProgress(100)
      setStatusMessage('Success! Your post is live')
      setPostStatus('success')
      
      // Show success toast
      setShowSuccessToast(true)
      
      // ✅ DISPATCH REAL-TIME EVENT - This makes the post appear immediately
      window.dispatchEvent(new CustomEvent('postCreated', { 
        detail: { 
          success: true, 
          post: data?.[0] || null 
        } 
      }))
      
      // Call the callback
      onPostCreated()
      
      // Close modal after success
      setTimeout(() => {
        setShowSuccessToast(false)
        onClose()
      }, 1500)
      
    } catch (err) {
      console.error('Error creating post:', err)
      setStatusMessage(err instanceof Error ? err.message : 'Failed to create post')
      setPostStatus('error')
      
      // Reset error after 3 seconds
      setTimeout(() => {
        if (postStatus === 'error') {
          setPostStatus('idle')
          setStatusMessage('')
        }
      }, 3000)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
          <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Post created successfully!</span>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
          </div>
          {postStatus !== 'uploading' && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Status Banner */}
          {postStatus !== 'idle' && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 ${
              postStatus === 'uploading' ? 'bg-blue-50 text-blue-600' :
              postStatus === 'success' ? 'bg-green-50 text-green-600' :
              'bg-red-50 text-red-600'
            }`}>
              {postStatus === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
              {postStatus === 'success' && <CheckCircle className="h-4 w-4" />}
              {postStatus === 'error' && <XCircle className="h-4 w-4" />}
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}

          {/* Upload Progress Bar */}
          {postStatus === 'uploading' && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {uploadProgress < 30 ? 'Preparing...' : 
                 uploadProgress < 70 ? 'Uploading media...' : 
                 uploadProgress < 100 ? 'Creating post...' : 'Almost done!'}
              </p>
            </div>
          )}

          {/* Feeling Picker */}
          <div className="mb-4">
            <button
              onClick={() => setShowFeelingPicker(!showFeelingPicker)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition"
              disabled={postStatus === 'uploading'}
            >
              {selectedFeeling ? (
                <>
                  <span className="text-xl">{selectedFeeling.emoji}</span>
                  <span>Feeling {selectedFeeling.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFeeling(null)
                    }}
                    className="ml-1 hover:text-red-500"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <Smile className="h-4 w-4" />
                  <span>How are you feeling?</span>
                </>
              )}
            </button>

            {showFeelingPicker && (
              <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {FEELINGS.map((feeling) => (
                    <button
                      key={feeling.label}
                      onClick={() => {
                        setSelectedFeeling(feeling)
                        setShowFeelingPicker(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition ${
                        selectedFeeling?.label === feeling.label
                          ? 'bg-orange-100 text-orange-600'
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="text-lg">{feeling.emoji}</span>
                      <span>{feeling.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full resize-none border-0 focus:ring-0 text-gray-700 placeholder:text-gray-400 text-base outline-none min-h-[100px] bg-transparent"
            rows={4}
            autoFocus
            disabled={postStatus === 'uploading'}
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {mediaType === 'image' ? (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-contain" />
              ) : (
                <video src={mediaPreview} className="w-full max-h-64 object-contain" controls />
              )}
              {postStatus !== 'uploading' && (
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
          {/* Media Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Add image"
                disabled={postStatus === 'uploading'}
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Add video"
                disabled={postStatus === 'uploading'}
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Add location"
                disabled={postStatus === 'uploading'}
              >
                <MapPin className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleMediaSelect(e, 'image')}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleMediaSelect(e, 'video')}
              />
            </div>
            
            {/* Character count */}
            <div className="text-xs text-gray-400">
              {content.length}/1000
            </div>
          </div>

          {/* Post Button */}
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !mediaFile) || postStatus === 'uploading'}
            className={`w-full py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 ${
              postStatus === 'uploading'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:shadow-lg'
            }`}
          >
            {postStatus === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : postStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Posted!
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post to Feed
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </>
  )
}
