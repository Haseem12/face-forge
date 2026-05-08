'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ChevronRight, Zap, Users, Flame } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }

      // Check if user has already completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', authUser.id)
        .single()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      setUser(authUser)
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const handleComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      router.push('/dashboard')
    } catch (error) {
      console.error('[v0] Onboarding complete error:', error)
    }
  }

  if (loading) return null

  const slides = [
    {
      icon: Flame,
      title: 'Welcome to FaceForge',
      description: 'Build your digital identity and shape your world with custom micro-apps',
    },
    {
      icon: Zap,
      title: 'Create Your Forges',
      description: 'Design and publish unique micro-applications that showcase your talents',
    },
    {
      icon: Users,
      title: 'Connect with Allies',
      description: 'Follow creators, discover new forges, and build your community',
    },
  ]

  const CurrentIcon = slides[step].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-pink-400 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent inline-block">
            F
          </div>
        </div>

        {/* Slide Content */}
        <div className="mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100 rounded-full mb-6">
            <CurrentIcon className="w-8 h-8 text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">
            {slides[step].title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {slides[step].description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 w-6'
                  : 'bg-gray-300 w-2'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {step < slides.length - 1 ? (
            <>
              <Button
                onClick={() => setStep(step + 1)}
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleComplete()}
                variant="outline"
                className="w-full text-gray-700"
              >
                Skip
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleComplete()}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-semibold"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
