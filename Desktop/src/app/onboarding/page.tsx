'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, Zap, Users, Flame, Sparkles, ArrowRight, Check } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  const interests = [
    'Technology', 'Art & Design', 'Music', 'Gaming',
    'Fitness', 'Food', 'Travel', 'Fashion',
    'Education', 'Business', 'Comedy', 'Sports'
  ]

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, interests')
        .eq('id', authUser.id)
        .single()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      if (profile?.interests?.length) {
        setSelectedInterests(profile.interests)
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
        .update({ 
          onboarding_completed: true,
          interests: selectedInterests
        })
        .eq('id', user.id)

      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
    }
  }

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest))
    } else if (selectedInterests.length < 6) {
      setSelectedInterests([...selectedInterests, interest])
    }
  }

  if (loading) return null

  // Interest Selection Step
  if (step === 1) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Progress */}
        <div className="fixed top-0 left-0 right-0 z-10 p-4">
          <div className="flex gap-1 max-w-md mx-auto">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-orange-500 to-purple-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-4">
              <Sparkles className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-white/70">Step 2 of 2</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              What do you love?
            </h1>
            <p className="text-white/50 text-sm">
              Pick up to 6 interests to personalize your feed
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest)
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {interest}
                  {isSelected && <Check className="inline ml-2 h-3 w-3" />}
                </button>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-white/30 text-xs">
              {selectedInterests.length}/6 selected
            </p>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent pt-12">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleComplete}
              disabled={selectedInterests.length === 0}
              className="w-full py-3.5 bg-white text-black rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Welcome Slides
  const slides = [
    {
      icon: Flame,
      title: 'Welcome to FaceForge',
      description: 'Build your digital identity and shape your world',
      color: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/20 to-red-500/10'
    },
    {
      icon: Zap,
      title: 'Create Forges',
      description: 'Design and publish micro-apps that showcase your talents',
      color: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/20 to-pink-500/10'
    },
    {
      icon: Users,
      title: 'Connect with Allies',
      description: 'Follow creators, discover forges, and build your community',
      color: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/20 to-cyan-500/10'
    },
  ]

  const CurrentIcon = slides[step].icon

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Progress Dots */}
      <div className="fixed top-0 left-0 right-0 z-10 p-4">
        <div className="flex gap-2 justify-center max-w-md mx-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-white'
                  : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Icon */}
        <div className={`mb-8 w-24 h-24 rounded-2xl bg-gradient-to-br ${slides[step].bgGradient} flex items-center justify-center backdrop-blur-sm`}>
          <CurrentIcon className={`w-12 h-12 bg-gradient-to-r ${slides[step].color} bg-clip-text text-transparent`} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white text-center mb-3">
          {slides[step].title}
        </h1>

        {/* Description */}
        <p className="text-white/50 text-center text-base leading-relaxed max-w-sm">
          {slides[step].description}
        </p>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent pt-12">
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={() => step < slides.length - 1 ? setStep(step + 1) : setStep(1)}
            className="w-full py-3.5 bg-white text-black rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            {step < slides.length - 1 ? 'Next' : 'Get Started'}
            <ChevronRight className="h-4 w-4" />
          </button>
          
          {step < slides.length - 1 && (
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 text-white/50 text-sm font-medium active:scale-95 transition"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
