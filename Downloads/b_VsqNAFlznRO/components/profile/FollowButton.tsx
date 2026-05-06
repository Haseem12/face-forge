'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing?: boolean
}

export default function FollowButton({ targetUserId, initialIsFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [supabase])

  const handleFollow = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch('/api/allies', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: targetUserId }),
        })
        if (!response.ok) throw new Error('Failed to unfollow')
      } else {
        // Follow
        const response = await fetch('/api/allies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: targetUserId }),
        })
        if (!response.ok) throw new Error('Failed to follow')
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      console.error('[v0] Follow error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser || currentUser.id === targetUserId) return null

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      variant={isFollowing ? 'outline' : 'default'}
      className="gap-2"
    >
      {loading && <Loader className="h-4 w-4 animate-spin" />}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  )
}
