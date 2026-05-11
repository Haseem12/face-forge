'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import FaceCanvas from '@/components/profile/FaceCanvas'
import { 
  Edit2, ArrowLeft, Camera, Loader2, MapPin, Link2, Calendar, 
  Users, Heart, MessageCircle, Share2, MoreHorizontal, Check,
  Settings, LogOut, UserPlus, UserCheck, Sparkles, Award
} from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage({ params: paramsPromise }: { params: Promise<{ username: string }> }) {
  const params = use(paramsPromise)
  const [profile, setProfile] = useState<any>(null)
  const [layout, setLayout] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)

  // Ally (follow) state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [forgeCount, setForgeCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-gray-300 animate-pulse -mt-12 mb-4" />
          <div className="h-8 w-48 bg-gray-300 animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-300 animate-pulse mb-8" />
          <div className="h-40 w-full bg-gray-300 animate-pulse rounded-xl" />
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
          <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/dashboard')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username || 'Unknown'
  const avatarUrl = profile.avatar_url || null
  const coverUrl = profile.cover_url || null
  const bio = profile.bio || null
  const location = profile.location || null
  const website = profile.website || null
  const joinedDate = profile.created_at ? new Date(profile.created_at) : null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Back Button */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Cover Image / Banner */}
      <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${displayName} cover`}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-600">
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Edit button for cover (only owner) */}
        {isOwnProfile && (
          <button
            onClick={() => router.push('/settings/profile')}
            className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-semibold hover:bg-black/70 transition"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden sm:inline">Edit Cover</span>
          </button>
        )}
      </div>

      {/* Profile Body */}
      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar & Identity */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4 -mt-12 sm:-mt-14">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => router.push('/settings/profile')}
                className="absolute bottom-0 right-0 p-1.5 bg-orange-500 rounded-full border-2 border-white shadow-lg hover:bg-orange-600 transition"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{displayName}</h1>
              {profile.is_verified && (
                <div className="bg-blue-500 rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">@{profile.username}</p>
          </div>

          {/* Options menu for own profile */}
          {isOwnProfile && (
            <div className="relative ml-auto" ref={optionsRef}>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </button>
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-fade-in">
                  <button
                    onClick={() => router.push('/settings/profile')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Location, Website, Joined */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
          {location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{location}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" />
              <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 hover:underline">
                {website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {joinedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {format(joinedDate, 'MMMM yyyy')}</span>
            </div>
          )}
        </div>

        {/* Stats with hover effects */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:shadow-md transition cursor-pointer group">
            <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text group-hover:scale-110 transition">
              {followerCount}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1 flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Allies
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:shadow-md transition cursor-pointer group">
            <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text group-hover:scale-110 transition">
              {followingCount}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1 flex items-center justify-center gap-1">
              <UserPlus className="h-3 w-3" />
              Following
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:shadow-md transition cursor-pointer group">
            <div className="text-xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text group-hover:scale-110 transition">
              {forgeCount}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1 flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" />
              Forges
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          {isOwnProfile ? (
            <Link href="/settings/profile">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all">
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
                  ? 'bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50'
                  : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {followLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Please wait
                </span>
              ) : isFollowing ? (
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Allied
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Ally
                </span>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
            >
              Sign in to connect
            </Button>
          )}
        </div>

        {/* Forges Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-gray-900">Forges</h2>
              <span className="bg-gradient-to-r from-orange-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {forgeCount}
              </span>
            </div>
            {forgeCount > 0 && (
              <button className="text-xs text-orange-500 hover:text-orange-600 font-semibold">
                View all →
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
            <FaceCanvas layout={layout} profile={profile} isEditable={isOwnProfile} />
          </div>
        </div>

        {/* Empty state for no forges */}
        {forgeCount === 0 && isOwnProfile && (
          <div className="text-center py-12 bg-white border border-gray-100 rounded-xl">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">You haven't created any forges yet</p>
            <Link href="/dashboard/forges/create">
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white">
                Create your first forge
              </Button>
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  )
}
