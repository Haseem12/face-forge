'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const redirectToProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        // Get user's username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', authUser.id)
          .single()

        if (profileData?.username) {
          router.push(`/profile/${profileData.username}`)
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('[v0] Profile redirect error:', error)
        router.push('/dashboard')
      }
    }

    redirectToProfile()
  }, [supabase, router])

  return null
}

