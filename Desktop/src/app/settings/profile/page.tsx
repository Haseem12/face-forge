// app/settings/profile/page.tsx - Updated version

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, Loader2, Save, User, Image as ImageIcon, Trash2, Check } from 'lucide-react'

export default function SettingsProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  
  // Only include columns that exist in your table
  // Remove location and website if they don't exist yet
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name || '')
        setUsername(profileData.username || '')
        setBio(profileData.bio || '')
        setAvatarUrl(profileData.avatar_url)
        setCoverUrl(profileData.cover_url)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File, type: 'avatar' | 'cover'): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${type}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      return null
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setSaving(true)
    const publicUrl = await uploadImage(file, 'avatar')
    if (publicUrl) {
      setAvatarUrl(publicUrl)
    }
    setSaving(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Cover image must be less than 10MB')
      return
    }

    setSaving(true)
    const publicUrl = await uploadImage(file, 'cover')
    if (publicUrl) {
      setCoverUrl(publicUrl)
    }
    setSaving(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      // Only update columns that exist
      const updateData: any = {
        display_name: displayName,
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: bio,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        updated_at: new Date().toISOString()
      }

      // Only add location and website if columns exist
      // You can check by trying to update or skip them for now

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      router.push(`/profile/${username}`)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white font-semibold text-lg">Edit Profile</h1>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full text-white text-sm font-medium flex items-center gap-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Cover Photo */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Cover Photo</label>
          <div className="relative h-40 rounded-xl overflow-hidden bg-gradient-to-r from-orange-500/20 to-purple-600/20">
            {coverUrl ? (
              <Image src={coverUrl} alt="Cover" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-white/30" />
              </div>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={saving}
              className="absolute bottom-3 right-3 px-3 py-2 bg-black/50 rounded-full text-white text-xs font-semibold flex items-center gap-1"
            >
              <Camera className="h-3 w-3" />
              Change
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </div>
        </div>

        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Profile Picture</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-purple-600">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white/50" />
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={saving}
                className="absolute -bottom-1 -right-1 p-1.5 bg-orange-500 rounded-full"
              >
                <Camera className="h-3 w-3 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <p className="text-xs text-gray-500">Recommended: Square image, max 5MB</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 resize-none"
              placeholder="Tell us about yourself"
              rows={3}
              maxLength={150}
            />
            <p className="text-xs text-gray-500 text-right mt-1">{bio.length}/150</p>
          </div>
        </div>
      </div>
    </div>
  )
}
