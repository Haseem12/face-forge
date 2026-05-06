'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, Share2, Flame, MessageCircle, TrendingUp } from 'lucide-react'

interface Forge {
  id: string
  name: string
  description?: string
  template_type: string
  user_id: string
  created_at: string
  is_published: boolean
  profiles: {
    id: string
    display_name: string
    username: string
    avatar_url?: string
  }
}

export default function SparkPage() {
  const [forges, setForges] = useState<Forge[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadSpark = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/login')
          return
        }
        setUser(authUser)

        // Get all published forges (algorithm feeds you new forges based on what you build)
        const { data: forgesData } = await supabase
          .from('forges')
          .select(`
            id,
            name,
            description,
            template_type,
            user_id,
            created_at,
            is_published,
            profiles:user_id(id, display_name, username, avatar_url)
          `)
          .eq('is_published', true)
          .neq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(30)

        setForges(forgesData || [])

        // Load following list
        const { data: alliesData } = await supabase
          .from('allies')
          .select('following_id')
          .eq('follower_id', authUser.id)

        if (alliesData) {
          setFollowing(new Set(alliesData.map((a: any) => a.following_id)))
        }

        setLoading(false)
      } catch (error) {
        console.error('[v0] Spark load error:', error)
        setLoading(false)
      }
    }

    loadSpark()
  }, [supabase, router])

  const handleFollow = async (userId: string) => {
    if (!user) return

    try {
      if (following.has(userId)) {
        await supabase
          .from('allies')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)
        setFollowing(new Set([...following].filter(id => id !== userId)))
      } else {
        await supabase
          .from('allies')
          .insert({ follower_id: user.id, following_id: userId })
        setFollowing(new Set([...following, userId]))
      }
    } catch (error) {
      console.error('[v0] Follow error:', error)
    }
  }

  const handleLike = async (forgeId: string) => {
    if (!user) return
    const isLiked = liked.has(forgeId)

    try {
      if (isLiked) {
        await supabase
          .from('interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('forge_id', forgeId)
          .eq('interaction_type', 'like')
        setLiked(new Set([...liked].filter(id => id !== forgeId)))
      } else {
        await supabase
          .from('interactions')
          .insert({ user_id: user.id, forge_id: forgeId, interaction_type: 'like' })
        setLiked(new Set([...liked, forgeId]))
      }
    } catch (error) {
      console.error('[v0] Like error:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-24">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 space-y-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-16 bg-white border-b border-gray-200 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Flame className="h-5 w-5 text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text" />
          <h1 className="text-lg font-bold">Discover</h1>
          <span className="text-xs text-gray-500 ml-auto">Algorithm Feed</span>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {forges.length > 0 ? (
          forges.map((forge) => {
            const creator = forge.profiles?.[0] || forge.profiles
            return (
              <article key={forge.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:border-gray-200 transition">
                {/* Creator Header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Link href={`/profile/${creator?.username}`}>
                        <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80">
                          {creator?.avatar_url ? (
                            <Image
                              src={creator.avatar_url}
                              alt={creator.display_name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              {creator?.display_name?.[0]}
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${creator?.username}`}>
                          <h3 className="text-sm font-semibold hover:underline cursor-pointer">
                            {creator?.display_name}
                          </h3>
                        </Link>
                        <p className="text-xs text-gray-500">@{creator?.username}</p>
                      </div>
                    </div>

                    {user?.id !== forge.user_id && (
                      <Button
                        size="sm"
                        variant={following.has(forge.user_id) ? 'outline' : 'default'}
                        onClick={() => handleFollow(forge.user_id)}
                        className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 border-0 text-white"
                      >
                        {following.has(forge.user_id) ? 'Following' : 'Follow'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Forge Content */}
                <Link href={`/spark/${forge.id}`}>
                  <div className="p-3 cursor-pointer hover:bg-gray-50 transition">
                    <h2 className="text-base font-bold mb-1 hover:underline">{forge.name}</h2>
                    {forge.description && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{forge.description}</p>
                    )}
                    <div className="bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100 rounded-lg p-4 text-center">
                      <div className="text-xs font-semibold text-transparent bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text uppercase mb-2">
                        {forge.template_type}
                      </div>
                      <div className="text-3xl">🔧</div>
                    </div>
                  </div>
                </Link>

                {/* Actions */}
                <div className="border-t border-gray-100 px-3 py-2 flex gap-1 text-gray-600">
                  <button
                    onClick={() => handleLike(forge.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded text-xs font-semibold transition"
                  >
                    <Heart
                      className={`h-4 w-4 ${liked.has(forge.id) ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    <span className="hidden sm:inline">Like</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded text-xs font-semibold transition">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Comment</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded text-xs font-semibold transition">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </article>
            )
          })
        ) : (
          <div className="bg-white rounded-lg border border-gray-100 p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">No Forges to discover</h3>
            <p className="text-xs text-gray-600">Follow more creators to see their forges</p>
          </div>
        )}
      </div>
    </div>
  )
}
