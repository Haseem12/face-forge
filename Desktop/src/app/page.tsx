'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // If user is logged in, go to onboarding
        router.push('/onboarding')
      } else {
        // If not logged in, go to login page
        router.push('/auth/login')
      }
    }

    checkAuthAndRedirect()
  }, [router, supabase])

  // Return null to show nothing while redirecting
  return null
}
