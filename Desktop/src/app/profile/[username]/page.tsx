// app/profile/[username]/page.tsx
'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import FaceCanvas from '@/components/profile/FaceCanvas'
import { 
  Edit2, ArrowLeft, Camera, Loader2, MapPin, Link2, Calendar, 
  Users, Heart, MessageCircle, Share2, MoreHorizontal, Check,
  Settings, LogOut, UserPlus, UserCheck, Sparkles, Award,
  Grid3X3, Video, Film, Play, Plus, X, Volume2, VolumeX
} from 'lucide-react'
import { format } from 'date-fns'

type TabType = 'forges' | 'videos' | 'fleex'

interface FleexVideo {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string
  caption: string
  music_name: string
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
}

export default function ProfilePage({ params: paramsPromise }: { params: Promise<{ username: string }> }) {
  const params = use(paramsPromise)
  const [profile, setProfile] = useState<any>(null)
  const [layout, setLayout] = useState<any[]>([])
  const [fleexVideos, setFleexVideos] = useState<FleexVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('forges')
  const optionsRef = useRef<HTMLDivElement>(null)
  
  // Video player state
  const [selectedVideo, setSelectedVideo] = useState<FleexVideo | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Ally (follow) state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [forgeCount, setForgeCount] = useState(0)
  const [fleexCount, setFleexCount] = useState(0)
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

  // Auto-play video when selected
  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      videoRef.current.play().catch(e => console.log('Auto-play error:', e))
    }
  }, [selectedVideo])

  // Handle escape key to close video player
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVideo) {
        setSelectedVideo(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedVideo])

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

        // Load fleex videos count
        const { count: userFleexCount } = await supabase
          .from('user_fleex')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileData.id)
        setFleexCount(userFleexCount ?? 0)

        // Load fleex videos
        const { data: fleexData } = await supabase
          .from('user_fleex')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(12)
        setFleexVideos(fleexData || [])

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
        console.error('[ProfilePage] Error:', error)
        setLoading(false)
      }
    }

    loadProfile()
  }, [mounted, params])

  const handleFollow = async () => {
    if (!currentUserId || !profile || followLoading) return
    const wasFollowing = isFollowing
    
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
      console.error('[Follow error]:', err)
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const openVideoPlayer = (video: FleexVideo) => {
    setSelectedVideo(video)
    // Prevent body scroll when video player is open
    document.body.style.overflow = 'hidden'
  }

  const closeVideoPlayer = () => {
    setSelectedVideo(null)
    document.body.style.overflow = 'unset'
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full h-48 bg-gradient-to-r from-gray-800 to-gray-900 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-gray-800 animate-pulse -mt-12 mb-4" />
          <div className="h-8 w-48 bg-gray-800 animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-800 animate-pulse mb-8" />
          <div className="h-40 w-full bg-gray-800 animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  // Not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            ?
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">The profile you're looking for doesn't exist.</p>
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

  const tabs: { key: TabType; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'forges', label: 'Forges', icon: Grid3X3, count: forgeCount },
    { key: 'videos', label: 'Videos', icon: Video, count: fleexCount },
    { key: 'fleex', label: 'Fleex', icon: Film, count: fleexCount },
  ]

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          {/* Options menu for own profile */}
          {isOwnProfile && (
            <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-full hover:bg-white/10 transition"
              >
                <MoreHorizontal className="h-5 w-5 text-white/70" />
              </button>
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-lg border border-white/10 overflow-hidden z-20 animate-fade-in">
                  <button
                    onClick={() => router.push('/settings/profile')}
                    className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cover Image / Banner */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {isOwnProfile && (
          <button
            onClick={() => router.push('/settings/profile')}
            className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-semibold"
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
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-black bg-black shadow-xl overflow-hidden">
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
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => router.push('/settings/profile')}
                className="absolute bottom-0 right-0 p-1.5 bg-orange-500 rounded-full border-2 border-black shadow-lg"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
              {profile.is_verified && (
                <div className="bg-blue-500 rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {profile.is_official && (
                <div className="bg-gradient-to-r from-orange-500 to-purple-600 rounded-full px-2 py-0.5">
                  <span className="text-white text-[10px] font-bold">OFFICIAL</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400">@{profile.username}</p>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Location, Website, Joined */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-400">
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-white">{formatNumber(followerCount)}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Allies</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-white">{formatNumber(followingCount)}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Following</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-white">{formatNumber(forgeCount)}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Forges</div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          {isOwnProfile ? (
            <Link href="/settings/profile">
              <button className="w-full py-3 bg-white/10 rounded-full text-white font-semibold hover:bg-white/20 transition active:scale-95">
                Edit Profile
              </button>
            </Link>
          ) : currentUserId ? (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`w-full py-3 rounded-full font-semibold transition active:scale-95 ${
                isFollowing
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90'
              }`}
            >
              {followLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Please wait
                </span>
              ) : isFollowing ? (
                <span className="flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Following
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Follow
                </span>
              )}
            </button>
          ) : (
            <Link href="/auth/login">
              <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full text-white font-semibold">
                Sign in to follow
              </button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition relative ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-xs ${isActive ? 'text-orange-500' : 'text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {/* Forges Tab */}
          {activeTab === 'forges' && (
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <FaceCanvas layout={layout} profile={profile} isEditable={isOwnProfile} />
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div>
              {isOwnProfile && (
                <Link href="/create-fleex">
                  <button className="w-full mb-4 py-3 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition">
                    <Plus className="h-4 w-4" />
                    Create Fleex
                  </button>
                </Link>
              )}
              
              {fleexVideos.length === 0 ? (
                <div className="text-center py-16">
                  <Video className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No videos yet</p>
                  {isOwnProfile && (
                    <Link href="/create-fleex">
                      <button className="mt-4 px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                        Upload your first video
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {fleexVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="relative aspect-[4/5] bg-white/5 cursor-pointer group active:scale-95 transition-transform"
                      onClick={() => openVideoPlayer(video)}
                    >
                      {video.thumbnail_url ? (
                        <Image
                          src={video.thumbnail_url}
                          alt={video.caption || 'Video'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/80 text-xs">
                        <Heart className="h-3 w-3" />
                        <span>{formatNumber(video.like_count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fleex Tab */}
          {activeTab === 'fleex' && (
            <div>
              {fleexVideos.length === 0 ? (
                <div className="text-center py-16">
                  <Film className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No fleex videos yet</p>
                  {isOwnProfile && (
                    <Link href="/create-fleex">
                      <button className="mt-4 px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                        Create your first fleex
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {fleexVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="relative aspect-[4/5] bg-white/5 cursor-pointer group active:scale-95 transition-transform"
                      onClick={() => openVideoPlayer(video)}
                    >
                      {video.thumbnail_url ? (
                        <Image
                          src={video.thumbnail_url}
                          alt={video.caption || 'Fleex'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/80 text-xs">
                        <Heart className="h-3 w-3" />
                        <span>{formatNumber(video.like_count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeVideoPlayer}
        >
          <div className="relative w-full h-full max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            {/* Video Player */}
            <video
              ref={videoRef}
              src={selectedVideo.video_url}
              className="w-full h-full object-contain"
              loop
              muted={isMuted}
              playsInline
              poster={selectedVideo.thumbnail_url}
              controls
              autoPlay
            />
            
            {/* Close Button */}
            <button
              onClick={closeVideoPlayer}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-95 transition"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            
            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
            </button>
            
            {/* Video Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white font-medium">{selectedVideo.caption || 'Untitled'}</p>
              <div className="flex items-center gap-3 mt-1 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(selectedVideo.like_count)}
                </span>
                <span>{selectedVideo.music_name || 'Original Sound'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
      `}</style>
    </div>
  )
}
