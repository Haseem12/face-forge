'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Link as LinkIcon, Heart, Users, Edit2 } from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  cover_url?: string
  bio?: string
  location?: string
}

interface Forge {
  id: string
  name: string
  template_type: string
  is_published: boolean
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [forges, setForges] = useState<Forge[]>([])
  const [followers, setFollowers] = useState(0)
  const [allies, setAllies] = useState(0)
  const [following, setFollowing] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'forges' | 'activity'>('forges')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/login')
          return
        }
        setUser(authUser)

        // Get own profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setProfile(profileData)

        // Get forges
        const { data: forgesData } = await supabase
          .from('forges')
          .select('id, name, template_type, is_published')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })

        setForges(forgesData || [])

        // Get stats
        const { count: followersCount } = await supabase
          .from('allies')
          .select('*', { count: 'exact' })
          .eq('following_id', authUser.id)

        const { count: followingCount } = await supabase
          .from('allies')
          .select('*', { count: 'exact' })
          .eq('follower_id', authUser.id)

        setFollowers(followersCount || 0)
        setFollowing(followingCount || 0)
        setAllies(followingCount || 0)

        setLoading(false)
      } catch (error) {
        console.error('[v0] Profile load error:', error)
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="w-full h-40" />
        <div className="max-w-3xl mx-auto px-4">
          <Skeleton className="h-24 w-24 rounded-full -mt-12 mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Cover Image */}
      <div className="h-40 md:h-56 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500 relative overflow-hidden">
        {profile?.cover_url && (
          <Image
            src={profile.cover_url}
            alt="Cover"
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Section */}
      <div className="max-w-3xl mx-auto px-4">
        {/* Avatar & Name */}
        <div className="relative -mt-12 mb-6 flex items-end gap-4">
          <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 via-pink-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {profile?.display_name?.[0]}
              </div>
            )}
          </div>

          <div className="flex-1 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{profile?.display_name}</h1>
            <p className="text-gray-600 text-sm">@{profile?.username}</p>
          </div>

          <Link href="/profile/edit">
            <Button className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </Link>
        </div>

        {/* Bio & Location */}
        {profile?.bio && <p className="text-gray-700 mb-3 text-sm">{profile.bio}</p>}
        {profile?.location && (
          <div className="flex items-center gap-1 text-gray-600 text-xs mb-4">
            <MapPin className="h-4 w-4" />
            {profile.location}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-100 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
              {forges.length}
            </div>
            <div className="text-xs text-gray-600 font-medium">Forges</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
              {followers}
            </div>
            <div className="text-xs text-gray-600 font-medium">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
              {following}
            </div>
            <div className="text-xs text-gray-600 font-medium">Following</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-4 bg-white rounded-t-lg px-4">
          <button
            onClick={() => setActiveTab('forges')}
            className={`py-3 text-sm font-semibold transition ${
              activeTab === 'forges'
                ? 'border-b-2 border-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Forges
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 text-sm font-semibold transition ${
              activeTab === 'activity'
                ? 'border-b-2 border-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        {activeTab === 'forges' && (
          <div className="space-y-3">
            {forges.length > 0 ? (
              forges.map((forge) => (
                <Link key={forge.id} href={`/spark/${forge.id}`}>
                  <div className="p-4 bg-white rounded-lg border border-gray-100 hover:border-purple-300 hover:shadow-md transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{forge.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{forge.template_type}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          forge.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {forge.is_published ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 bg-white rounded-lg border border-gray-100 text-center">
                <p className="text-gray-600 text-sm mb-4">No forges created yet</p>
                <Link href="/dashboard/forges/create">
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-purple-600">
                    Create Your First Forge
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700">Your activity will appear here</p>
                <p className="text-xs text-gray-500 mt-1">2m ago</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
