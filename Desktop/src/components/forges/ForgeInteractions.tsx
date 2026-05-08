'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react'

interface ForgeInteractionsProps {
  forgeId: string
}

export default function ForgeInteractions({ forgeId }: ForgeInteractionsProps) {
  const [likes, setLikes] = useState(0)
  const [userLiked, setUserLiked] = useState(false)
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

  useEffect(() => {
    const loadInteractions = async () => {
      try {
        // Get like count
        const { data: interactions } = await supabase
          .from('interactions')
          .select('*')
          .eq('forge_id', forgeId)
          .eq('interaction_type', 'like')

        setLikes(interactions?.length || 0)

        // Check if user liked
        if (currentUser) {
          const { data: userInteraction } = await supabase
            .from('interactions')
            .select('*')
            .eq('forge_id', forgeId)
            .eq('user_id', currentUser.id)
            .eq('interaction_type', 'like')
            .single()

          setUserLiked(!!userInteraction)
        }
      } catch (error) {
        console.error('[v0] Error loading interactions:', error)
      }
    }

    loadInteractions()
  }, [forgeId, currentUser, supabase])

  const handleLike = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      if (userLiked) {
        // Unlike
        await fetch('/api/interactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forgeId }),
        })
        setLikes(Math.max(0, likes - 1))
      } else {
        // Like
        await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forgeId, interactionType: 'like' }),
        })
        setLikes(likes + 1)
      }
      setUserLiked(!userLiked)
    } catch (error) {
      console.error('[v0] Like error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this Forge',
          url: window.location.href,
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch (error) {
      console.error('[v0] Share error:', error)
    }
  }

  return (
    <div className="flex items-center gap-4 py-4 border-t">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={loading || !currentUser}
        className={`gap-2 ${userLiked ? 'text-red-500' : ''}`}
      >
        <ThumbsUp className={`h-4 w-4 ${userLiked ? 'fill-current' : ''}`} />
        {likes > 0 && <span>{likes}</span>}
      </Button>

      <Button variant="ghost" size="sm" className="gap-2 opacity-50 cursor-not-allowed">
        <MessageCircle className="h-4 w-4" />
        Comment
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  )
}
