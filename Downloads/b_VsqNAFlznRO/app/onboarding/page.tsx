'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check, Sparkles, Users, Zap, Palette } from 'lucide-react'
import Link from 'next/link'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setLoading(false)
    }
    checkUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const steps = [
    {
      title: 'Welcome to FaceForge',
      description: 'Build your digital identity with customizable micro-apps called Forges.',
      icon: Sparkles,
      features: [
        'Create beautiful profile pages (Face)',
        'Build interactive Forges (micro-apps)',
        'Connect with creators (Allies)',
        'Discover trending content (Spark)',
      ],
    },
    {
      title: 'Your Digital Face',
      description: 'Set up your profile and let the world know who you are.',
      icon: Palette,
      features: [
        'Upload a profile picture',
        'Write your bio',
        'Add a cover photo',
        'Customize your look',
      ],
    },
    {
      title: 'Create Your First Forge',
      description: 'Build interactive Forges using templates or custom code.',
      icon: Zap,
      features: [
        'Choose from 10+ templates',
        'Customize colors and content',
        'Publish to your Face',
        'Share with the world',
      ],
    },
    {
      title: 'Connect & Discover',
      description: 'Follow creators and discover content in your Spark feed.',
      icon: Users,
      features: [
        'Follow creators (Allies)',
        'Like and share Forges',
        'Personalized recommendations',
        'Build your community',
      ],
    },
  ]

  const CurrentIcon = steps[step].icon

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden">
      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur border-b border-border z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold hidden sm:inline">FaceForge</span>
          </Link>
          {user && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Skip
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8 md:mb-12">
            <div className="flex justify-between mb-4 gap-2">
              {steps.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-muted rounded-full">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Step {step + 1} of {steps.length}
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-12 shadow-lg">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CurrentIcon className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Content */}
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
              {steps[step].title}
            </h1>
            <p className="text-center text-muted-foreground mb-8 text-lg">
              {steps[step].description}
            </p>

            {/* Features */}
            <div className="space-y-3 mb-12">
              {steps[step].features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm md:text-base">{feature}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-30" />
      </div>
    </div>
  )
}
