'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import FaceCanvas from '@/components/profile/FaceCanvas'
import { Edit2, ArrowLeft, Camera, Loader2 } from 'lucide-react'

export default function ProfilePage({ params: paramsPromise }: { params: Promise<{ username: string }> }) {
  const params = use(paramsPromise)
  const [profile, setProfile] = useState<any>(null)
  const [layout, setLayout] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Ally (follow) state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [forgeCount, setForgeCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !params?.username) return

    const loadProfile = async () => {
      try {
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', params.username)

        if (profileError) throw profileError
        if (!profilesData || profilesData.length === 0) { setLoading(false); return }

        const profileData = profilesData[0]
        setProfile(profileData)

        const { data: userData } = await supabase.auth.getUser()
        const uid = userData.user?.id ?? null
        setCurrentUserId(uid)

        if (uid === profileData.id) {
          setIsOwnProfile(true)
        }

        // Load face layout
        const { data: layoutData } = await supabase
          .from('face_layout')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: true })
        setLayout(layoutData || [])

        // Load forges count
        const { count: forgesCount } = await supabase
          .from('forges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileData.id)
        setForgeCount(forgesCount ?? 0)

        // Load ally counts
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from('allies').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
          supabase.from('allies').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        ])
        setFollowerCount(followers ?? 0)
        setFollowingCount(following ?? 0)

        // Check if current user follows this profile
        if (uid && uid !== profileData.id) {
          const { data: allyData } = await supabase
            .from('allies')
            .select('id')
            .eq('follower_id', uid)
            .eq('following_id', profileData.id)
            .maybeSingle()
          setIsFollowing(!!allyData)
        }

        setLoading(false)
      } catch (error) {
        console.error('[v0] ProfilePage Error:', error)
        setLoading(false)
      }
    }

    loadProfile()
  }, [mounted, params])

  const handleFollow = async () => {
    if (!currentUserId || !profile || followLoading) return
    const wasFollowing = isFollowing
    
    // Optimistic update
    setIsFollowing(!wasFollowing)
    setFollowerCount(c => wasFollowing ? Math.max(0, c - 1) : c + 1)
    setFollowLoading(true)
    
    try {
      if (wasFollowing) {
        const response = await fetch('/api/allies', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: profile.id }),
        })
        if (!response.ok) throw new Error('Failed to unfollow')
      } else {
        const response = await fetch('/api/allies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: profile.id }),
        })
        if (!response.ok) throw new Error('Failed to follow')
      }
    } catch (err) {
      console.error('[v0] Follow error:', err)
      // Revert on error
      setIsFollowing(wasFollowing)
      setFollowerCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1))
    } finally {
      setFollowLoading(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full h-44 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-gray-300 animate-pulse -mt-12 mb-4" />
          <div className="h-8 w-40 bg-gray-300 animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-300 animate-pulse mb-8" />
          <div className="h-40 w-full bg-gray-300 animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  // Not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            ?
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">The profile you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username || 'Unknown'
  const avatarUrl = profile.avatar_url || null
  const coverUrl = profile.cover_url || null
  const bio = profile.bio || null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Cover Image / Banner */}
      <div className="relative w-full h-44 sm:h-52 md:h-60 overflow-hidden bg-gradient-to-r from-orange-400 via-pink-400 to-purple-600">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${displayName} cover`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          // Default gradient overlay if no cover
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-600" />
        )}
        
        {/* Optional: faint overlay to make text readable if image is too bright */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Edit button for cover (only owner) */}
        {isOwnProfile && (
          <button
            onClick={() => router.push('/settings/profile')}
            className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white text-xs font-semibold hover:bg-white/30 transition"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden sm:inline">Edit Cover</span>
          </button>
        )}
      </div>

      {/* Profile Body */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar & Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6 -mt-12 sm:-mt-14">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 pb-1 pt-1 sm:pt-0">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{displayName}</h1>
            <p className="text-sm font-semibold text-gray-500">@{profile.username}</p>
          </div>

          {/* Edit profile (own profile) on mobile: top right? we put it here for sm+ */}
          {isOwnProfile && (
            <button
              onClick={() => router.push('/settings/profile')}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-full text-gray-700 text-xs font-semibold hover:bg-gray-50 transition ml-auto self-center"
            >
              <Edit2 className="w-3 h-3" />
              Edit profile
            </button>
          )}
        </div>

        {/* Bio */}
        {bio && <p className="text-sm text-gray-700 mb-6 leading-relaxed">{bio}</p>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-0 bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
              {followerCount}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Allies</div>
          </div>
          <div className="border-l border-r border-gray-200">
            <div className="text-center">
              <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
                {followingCount}
              </div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Allied with</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
              {forgeCount}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Forges</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          {isOwnProfile ? (
            <Link href="/settings/profile">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          ) : currentUserId ? (
            <Button
              onClick={handleFollow}
              disabled={followLoading}
              className={`w-full font-bold transition-all ${
                isFollowing
                  ? 'bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50'
                  : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white'
              }`}
            >
              {followLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Please wait
                </span>
              ) : isFollowing ? (
                'Remove Ally'
              ) : (
                '+ Add Ally'
              )}
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold"
            >
              Sign in to connect
            </Button>
          )}
        </div>

        {/* Forges Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-black text-gray-900">Forges</h2>
            <span className="bg-gradient-to-r from-orange-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {forgeCount}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden min-h-48">
            <FaceCanvas layout={layout} profile={profile} isEditable={isOwnProfile} />
          </div>
        </div>
      </div>
    </div>
  )
}