'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Smile } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'

interface Story {
  id: string
  user_id: string
  media_url: string
  caption?: string | null
  created_at: string
}

export default function StoriesStrip({
  users,
  currentUserId,
  onOpenStory,
}: {
  users: any[]
  currentUserId: string | null
  onOpenStory: (userId: string) => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({})
  const [uploading, setUploading] = useState(false)

  // Caption modal state
  const [captionModal, setCaptionModal] = useState<{
    file: File
    previewUrl: string
  } | null>(null)
  const [caption, setCaption] = useState('')

  // Dynamic header height for sticky positioning
  const [headerHeight, setHeaderHeight] = useState(80)

  // Fetch unexpired stories for the given users + current user
  useEffect(() => {
    const userIds = users.map(u => u.id)
    if (currentUserId) {
      userIds.push(currentUserId) // include the current user
    }
    if (!userIds.length) return

    supabase
      .from('stories')
      .select('id, user_id, media_url, caption, created_at')
      .in('user_id', userIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return
        const grouped: Record<string, Story[]> = {}
        data.forEach(s => {
          if (!grouped[s.user_id]) grouped[s.user_id] = []
          grouped[s.user_id].push(s)
        })
        setStoriesByUser(grouped)
      })
  }, [users, currentUserId, supabase])

  // Calculate header height on mount and when window resizes
  useEffect(() => {
    const updateHeight = () => {
      // Target the DashboardHeader's outer div (sticky, top-0, z-40)
      const header = document.querySelector('.sticky.top-0.z-40')
      if (header) {
        setHeaderHeight(header.clientHeight)
      } else {
        setHeaderHeight(80) // fallback
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Handle file selection → open caption modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    const previewUrl = URL.createObjectURL(file)
    setCaptionModal({ file, previewUrl })
    setCaption('')
    // Reset file input so same file can be re‑selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Upload story with caption
  const handleUploadWithCaption = async () => {
    if (!captionModal || !currentUserId) return
    const { file, previewUrl } = captionModal
    setUploading(true)
    setCaptionModal(null) // close modal

    try {
      const filePath = `${currentUserId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath)

      const mediaUrl = publicUrlData.publicUrl

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUserId,
          media_url: mediaUrl,
          caption: caption.trim() || null,
        })

      if (insertError) throw insertError

      // Optimistic update
      const newStory: Story = {
        id: '',
        user_id: currentUserId,
        media_url: mediaUrl,
        caption: caption.trim() || null,
        created_at: new Date().toISOString(),
      }
      setStoriesByUser(prev => ({
        ...prev,
        [currentUserId]: [...(prev[currentUserId] || []), newStory],
      }))
    } catch (error) {
      console.error('Story upload failed:', error)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(previewUrl) // clean up
    }
  }

  const handleAddStoryClick = () => {
    if (!currentUserId) return
    fileInputRef.current?.click()
  }

  const hasStory = (userId: string) =>
    storiesByUser[userId] && storiesByUser[userId].length > 0

  return (
    <>
      <div
        className="sticky z-10 bg-white border-b border-gray-100 py-3"
        style={{ top: `${headerHeight}px` }}
      >
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {/* Add story button */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <button
                onClick={handleAddStoryClick}
                disabled={uploading || !currentUserId}
                className="w-14 h-14 rounded-full border-2 border-dashed border-orange-300 bg-orange-50 flex items-center justify-center cursor-pointer hover:border-orange-400 transition disabled:opacity-50"
              >
                {uploading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-orange-500 rounded-full border-t-transparent" />
                ) : (
                  <Plus className="h-5 w-5 text-orange-500" />
                )}
              </button>
              <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                Your story
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />
            </div>

            {/* User stories */}
            {users.filter(u => hasStory(u.id)).slice(0, 10).map(u => (
              <button
                key={u.id}
                onClick={() => hasStory(u.id) && onOpenStory(u.id)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div
                  className={`p-0.5 rounded-full ${
                    hasStory(u.id)
                      ? 'bg-gradient-to-br from-orange-400 to-purple-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <div className="p-0.5 bg-white rounded-full">
                    <AvatarCircle src={u.avatar_url} name={u.display_name} size={48} />
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-medium max-w-[52px] truncate">
                  {u.display_name?.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caption modal */}
      {captionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative">
            <button
              onClick={() => {
                URL.revokeObjectURL(captionModal.previewUrl)
                setCaptionModal(null)
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-sm mb-3">Add a caption</h3>

            {/* Preview */}
            <div className="w-full h-48 rounded-lg overflow-hidden mb-3">
              {captionModal.file.type.startsWith('video') ? (
                <video
                  src={captionModal.previewUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              ) : (
                <img
                  src={captionModal.previewUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Caption input */}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write something... ✨"
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
              autoFocus
            />

            <div className="flex justify-between items-center mt-3">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Smile className="h-3.5 w-3.5" /> Emojis supported 🚀
              </span>
              <button
                onClick={handleUploadWithCaption}
                disabled={uploading}
                className="px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {uploading ? 'Posting...' : 'Post Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}