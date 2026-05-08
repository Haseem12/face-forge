'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import CustomForgeViewer from '@/components/forges/CustomForgeViewer'
import TemplateForgeViewer from '@/components/forges/TemplateForgeViewer'
import ForgeInteractions from '@/components/forges/ForgeInteractions'

interface Forge {
  id: string
  name: string
  description?: string
  template_type: string
  config: Record<string, any>
  custom_code?: string
  user_id: string
  created_at: string
  profiles: {
    id: string
    display_name: string
    username: string
    avatar_url?: string
  }
}

export default function ForgeViewerPage({ params: paramsPromise }: { params: Promise<{ forgeId: string }> }) {
  const params = use(paramsPromise)
  const [forge, setForge] = useState<Forge | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !params?.forgeId) return

    const loadData = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setUser(user)

        // Get forge details
        const response = await fetch(`/api/forges?id=${params.forgeId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true)
          }
          throw new Error('Failed to load forge')
        }

        const forgeData = await response.json()
        console.log('[v0] Forge data loaded:', forgeData)

        // Get forge owner profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', forgeData.user_id)
          .single()

        if (profileError) {
          console.error('[v0] Profile fetch error:', profileError)
          throw profileError
        }

        const forgeWithProfile = {
          ...forgeData,
          profiles: profileData,
        }

        setForge(forgeWithProfile)

        // Check if current user follows the forge creator
        if (user) {
          const followingResponse = await fetch(`/api/allies?userId=${user.id}&type=following`)
          if (followingResponse.ok) {
            const followingData = await followingResponse.json()
            setIsFollowing(followingData.some((a: any) => a.following_id === forgeData.user_id))
          }
        }

        // Record view interaction
        if (user) {
          await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              forge_id: params.forgeId,
              interaction_type: 'view',
            }),
          })
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading forge:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [mounted, params, supabase])

  const handleFollow = async () => {
    if (!forge || !user) return

    try {
      const response = await fetch('/api/allies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: forge.user_id }),
      })

      if (!response.ok) throw new Error('Failed to follow')
      setIsFollowing(true)
    } catch (error) {
      console.error('Error following:', error)
    }
  }

  const handleUnfollow = async () => {
    if (!forge || !user) return

    try {
      const response = await fetch(`/api/allies?following_id=${forge.user_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to unfollow')
      setIsFollowing(false)
    } catch (error) {
      console.error('Error unfollowing:', error)
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background">
        <Skeleton className="w-full h-48" />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (notFound || !forge) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Forge Not Found</h1>
          <Link href="/spark">
            <Button>Back to Spark</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link href={`/profile/${forge.profiles.username}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-background flex-shrink-0">
              {forge.profiles.avatar_url ? (
                <Image
                  src={forge.profiles.avatar_url}
                  alt={forge.profiles.display_name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                  {forge.profiles.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{forge.profiles.display_name}</p>
              <p className="text-xs text-muted-foreground">@{forge.profiles.username}</p>
            </div>
          </Link>

          {user && user.id !== forge.user_id && (
            <Button
              size="sm"
              variant={isFollowing ? 'outline' : 'default'}
              onClick={isFollowing ? handleUnfollow : handleFollow}
              className="flex-shrink-0"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        <Link href="/spark">
          <Button variant="outline" size="sm">
            Back
          </Button>
        </Link>
      </div>

      {/* Forge Name and Description */}
      <div className="bg-card border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">{forge.name}</h1>
        {forge.description && <p className="text-sm text-muted-foreground">{forge.description}</p>}
      </div>

      {/* Forge Content */}
      <div className="flex-1 overflow-hidden">
        {forge.template_type === 'custom' && forge.custom_code ? (
          <CustomForgeViewer customCode={forge.custom_code} forgeId={forge.id} />
        ) : (
          <TemplateForgeViewer forge={forge} />
        )}
      </div>

      {/* Interactions */}
      <div className="border-t bg-card px-4">
        <ForgeInteractions forgeId={forge.id} />
      </div>
    </div>
  )
}
