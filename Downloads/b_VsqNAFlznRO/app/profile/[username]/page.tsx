'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import ProfileHeader from '@/components/profile/ProfileHeader'
import FaceCanvas from '@/components/profile/FaceCanvas'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfilePage({ params: paramsPromise }: { params: Promise<{ username: string }> }) {
  const params = use(paramsPromise)
  const [profile, setProfile] = useState<any>(null)
  const [layout, setLayout] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !params?.username) return

    const loadProfile = async () => {
      try {
        // Get profile by username (case-insensitive)
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', params.username)

        if (profileError) {
          console.error('[v0] Profile fetch error:', profileError)
          throw profileError
        }

        if (!profilesData || profilesData.length === 0) {
          console.log('[v0] No profile found for username:', params.username)
          setLoading(false)
          return
        }

        const profileData = profilesData[0]
        setProfile(profileData)

        // Check if this is the current user's profile
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.id === profileData.id) {
          setIsOwnProfile(true)
        }

        // Get face layout
        const { data: layoutData, error: layoutError } = await supabase
          .from('face_layout')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: true })

        if (layoutError) {
          console.error('[v0] Layout fetch error:', layoutError)
          throw layoutError
        }
        setLayout(layoutData || [])

        setLoading(false)
      } catch (error) {
        console.error('[v0] Error loading profile:', error)
        setLoading(false)
      }
    }

    loadProfile()
  }, [mounted, params, supabase])

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background">
        <Skeleton className="w-full h-48" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="w-32 h-32 rounded-full mb-4" />
          <Skeleton className="w-64 h-8 mb-4" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Forges</h2>
          <FaceCanvas layout={layout} profile={profile} isEditable={isOwnProfile} />
        </div>
      </div>
    </div>
  )
}
