'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Camera, Upload } from 'lucide-react'

interface PhotoUploadProps {
  type: 'avatar' | 'cover'
  currentUrl?: string
  onUpload: (url: string) => void
  isEditing?: boolean
}

export default function PhotoUpload({ type, currentUrl, onUpload, isEditing = false }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert file to base64 and send to API
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/profiles/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data: base64,
          fileName: `${type}-${user.id}-${Date.now()}`,
        }),
      })

      if (!response.ok) throw new Error('Upload failed')

      const { url } = await response.json()
      onUpload(url)
    } catch (error) {
      console.error('[v0] Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = previewUrl || currentUrl

  if (type === 'avatar') {
    return (
      <div className="relative inline-block">
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Avatar"
            width={120}
            height={120}
            className="rounded-full object-cover border-4 border-background"
          />
        ) : (
          <div className="w-30 h-30 rounded-full bg-muted flex items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {isEditing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
      {displayUrl ? (
        <Image
          src={displayUrl}
          alt="Cover"
          fill
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {isEditing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:opacity-50"
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <Upload className="h-6 w-6" />
            <span className="text-sm">Change Cover</span>
          </div>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />
    </div>
  )
}
