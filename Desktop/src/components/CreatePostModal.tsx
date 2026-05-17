'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { 
  X, Image as ImageIcon, Video, Send, Loader2, 
  MapPin, Smile, AtSign, Heart, ThumbsUp, 
  Frown, Meh, Zap, Coffee, PartyPopper, 
  Trash2, Sparkles, XCircle
} from 'lucide-react'

// Emotions/Feelings options
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

// Mention suggestions (fetch from your database in production)
const MENTION_SUGGESTIONS = [
  { username: 'johndoe', name: 'John Doe', avatar: '' },
  { username: 'janedoe', name: 'Jane Doe', avatar: '' },
]

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showFeelingPicker, setShowFeelingPicker] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isOpen) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content, isOpen])

  // Reset form when modal closes
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
    setError(null)
    setShowMentions(false)
    setShowFeelingPicker(false)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    
    // Check for @mention
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1)
      if (!query.includes(' ') && query.length > 0) {
        setMentionQuery(query)
        setShowMentions(true)
        setCursorPosition(cursorPos)
        return
      }
    }
    setShowMentions(false)
  }

  const insertMention = (username: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition)
    const textAfterCursor = content.slice(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${username} ` + textAfterCursor
    setContent(newText)
    setShowMentions(false)
    setMentionQuery('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValidImage = type === 'image' && file.type.startsWith('image/')
    const isValidVideo = type === 'video' && file.type.startsWith('video/')
    
    if (!isValidImage && !isValidVideo) {
      setError(`Please select a valid ${type} file`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      return
    }

    setMediaFile(file)
    setMediaType(type)
    setMediaPreview(URL.createObjectURL(file))
    setError(null)
  }

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile || !userId) return null
    
    const fileExt = mediaFile.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = `feeds/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('feed-media')
      .upload(filePath, mediaFile)
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      setError('Failed to upload media. Please try again.')
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('feed-media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      setError('Please write something or add media')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      let mediaUrl = null
      if (mediaFile) {
        mediaUrl = await uploadMedia()
      }
      
      // Build post content with feeling if selected
      let finalContent = content
      if (selectedFeeling) {
        finalContent = `Feeling ${selectedFeeling.label} ${selectedFeeling.emoji}\n\n${content}`
      }
      
      const { error: insertError } = await supabase
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
      
      if (insertError) throw insertError
      
      onPostCreated()
      onClose()
      
    } catch (error) {
      console.error('Error creating post:', error)
      setError('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const filteredMentions = MENTION_SUGGESTIONS.filter(
    u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
         u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Feeling Picker */}
          <div className="mb-4">
            <button
              onClick={() => setShowFeelingPicker(!showFeelingPicker)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition"
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
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="What's on your mind? Type @ to mention someone..."
              className="w-full resize-none border-0 focus:ring-0 text-gray-700 placeholder:text-gray-400 text-base outline-none min-h-[100px] bg-transparent"
              rows={4}
              autoFocus
            />
          </div>

          {/* Mentions Dropdown */}
          {showMentions && filteredMentions.length > 0 && (
            <div className="mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
              {filteredMentions.map((user) => (
                <button
                  key={user.username}
                  onClick={() => insertMention(user.username)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <div className="relative">
                {mediaType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-contain" />
                ) : (
                  <video src={mediaPreview} className="w-full max-h-64 object-contain" controls />
                )}
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg text-red-500 text-xs flex items-center gap-2">
              <span>⚠️</span>
              {error}
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
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const videoInput = document.createElement('input')
                  videoInput.type = 'file'
                  videoInput.accept = 'video/*'
                  videoInput.onchange = (e) => handleMediaSelect(e as any, 'video')
                  videoInput.click()
                }}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Add video"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Add location"
              >
                <MapPin className="h-5 w-5" />
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition"
                title="Tag someone"
                onClick={() => {
                  setContent(content + ' @')
                  textareaRef.current?.focus()
                }}
              >
                <AtSign className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleMediaSelect(e, 'image')}
              />
            </div>
            
            <div className="text-xs text-gray-400">
              {mediaType === 'image' ? '📷 Image ready' : mediaType === 'video' ? '🎥 Video ready' : '📝 Write something'}
            </div>
          </div>

          {/* Post Button */}
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !mediaFile) || isSubmitting}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-98"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                Post to Feed
              </div>
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
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </>
  )
}
