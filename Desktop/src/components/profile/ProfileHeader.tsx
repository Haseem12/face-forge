'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import FollowButton from './FollowButton'
import PhotoUpload from './PhotoUpload'

export default function ProfileHeader({ profile, isOwnProfile }: { profile: any; isOwnProfile: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!isOwnProfile) return

    setSaving(true)
    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
        }),
      })

      if (!response.ok) throw new Error('Failed to save profile')
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative w-full">
      {/* Cover Image */}
      {isEditing && isOwnProfile ? (
        <PhotoUpload
          type="cover"
          currentUrl={profile?.cover_url}
          onUpload={(url) => {
            profile.cover_url = url
          }}
          isEditing={true}
        />
      ) : (
        <div className="relative w-full h-48 bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden">
          {profile?.cover_url && (
            <Image
              src={profile.cover_url}
              alt="Cover"
              fill
              className="object-cover"
            />
          )}
        </div>
      )}

      {/* Profile Info */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="-mt-24 relative">
            {isEditing && isOwnProfile ? (
              <PhotoUpload
                type="avatar"
                currentUrl={profile?.avatar_url}
                onUpload={(url) => {
                  profile.avatar_url = url
                }}
                isEditing={true}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-background border-4 border-background overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                    {profile?.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1 pt-8">
            {isEditing && isOwnProfile ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-3xl font-bold bg-background border border-border rounded px-2 py-1"
                  placeholder="Display name"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 min-h-20"
                  placeholder="Bio"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2">{profile?.display_name}</h1>
                <p className="text-muted-foreground mb-4">@{profile?.username}</p>
                {profile?.bio && <p className="text-foreground mb-6">{profile.bio}</p>}
                <div className="flex gap-2">
                  {isOwnProfile && (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      Edit Profile
                    </Button>
                  )}
                  {!isOwnProfile && (
                    <FollowButton profileId={profile?.id} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Links */}
          {isOwnProfile && (
            <div className="pt-8">
              <Link href="/dashboard">
                <Button variant="default">
                  Dashboard
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
