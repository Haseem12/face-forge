'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Globe,
  Shield,
  Play,
} from 'lucide-react'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setLoading(false)

      if (user) {
        router.push('/onboarding')
      }
    }

    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="FaceForge"
              width={70}
              height={70}
              className="rounded-2xl"
              priority
            />
          </div>

          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
            FaceForge
          </h1>

          <p className="text-sm text-gray-500 mt-2 animate-pulse">
            Building your digital identity...
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa] text-gray-900">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-120px] h-[350px] w-[350px] rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-100px] h-[350px] w-[350px] rounded-full bg-purple-300/30 blur-3xl" />
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="FaceForge Logo"
              width={42}
              height={42}
              className="rounded-xl shadow-sm"
              priority
            />

            <div>
              <h1 className="text-xl font-black leading-none bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                FaceForge
              </h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                Creator Identity Platform
              </p>
            </div>
          </Link>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button
                variant="outline"
                className="rounded-full border-gray-200 px-5"
              >
                Login
              </Button>
            </Link>

            <Link href="/auth/sign-up">
              <Button className="rounded-full bg-gradient-to-r from-orange-500 to-purple-600 px-5 text-white hover:opacity-90">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-16 pb-24 text-center lg:pt-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 shadow-sm">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-700">
            Build. Connect. Discover.
          </span>
        </div>

        {/* Heading */}
        <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Forge Your
          <span className="block bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Digital Identity
          </span>
        </h1>

        {/* Paragraph */}
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
          FaceForge helps creators build beautiful profile spaces, interactive
          micro-apps, communities, and AI-powered discovery experiences —
          without needing a full website.
        </p>

        {/* CTA */}
        <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/auth/sign-up" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-purple-600 px-8 text-base font-bold text-white hover:opacity-90">
              Start Building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Link href="/auth/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-gray-200 px-8 text-base"
            >
              <Play className="mr-2 h-4 w-4" />
              Login
            </Button>
          </Link>
        </div>

        {/* Mock UI Preview */}
        <div className="relative mt-16 w-full max-w-5xl">
          <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-2xl">
            <Image
              src="/logo.png"
              alt="FaceForge Preview"
              width={1400}
              height={800}
              className="mx-auto h-28 w-28 object-contain py-10"
            />

            <div className="grid gap-4 border-t border-gray-100 bg-gray-50 p-6 md:grid-cols-3">
              {[
                'AI-powered identity feeds',
                'Custom creator micro-apps',
                'Social discovery engine',
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white">
                    <Zap className="h-5 w-5" />
                  </div>

                  <h3 className="font-bold text-gray-800">{item}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Create immersive digital experiences that feel modern,
                    social, and interactive.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange-500">
            Platform Features
          </p>

          <h2 className="text-4xl font-black text-gray-900">
            Everything You Need to Build Presence
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: '👤',
              title: 'Face',
              desc: 'Your public identity hub with profile, media, and links.',
            },
            {
              icon: '⚡',
              title: 'Forges',
              desc: 'Interactive creator tools, apps, blogs, portfolios, and more.',
            },
            {
              icon: '🔗',
              title: 'Allies',
              desc: 'Build communities and meaningful creator relationships.',
            },
            {
              icon: '✨',
              title: 'Spark',
              desc: 'AI-driven discovery feed tailored to your creativity.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 text-5xl">{feature.icon}</div>

              <h3 className="mb-3 text-2xl font-black text-gray-900">
                {feature.title}
              </h3>

              <p className="leading-relaxed text-gray-500">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-5 rounded-[36px] border border-gray-200 bg-white p-8 md:grid-cols-4">
          {[
            {
              icon: <Users className="h-5 w-5" />,
              value: '50K+',
              label: 'Creators',
            },
            {
              icon: <Zap className="h-5 w-5" />,
              value: '120K+',
              label: 'Forges Built',
            },
            {
              icon: <Globe className="h-5 w-5" />,
              value: '190+',
              label: 'Countries',
            },
            {
              icon: <Shield className="h-5 w-5" />,
              value: '99.9%',
              label: 'Platform Uptime',
            },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-purple-600 text-white">
                {stat.icon}
              </div>

              <h3 className="text-3xl font-black">{stat.value}</h3>

              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <div className="rounded-[40px] bg-gradient-to-r from-orange-500 to-purple-600 px-8 py-16 text-white shadow-2xl">
          <h2 className="text-4xl font-black sm:text-5xl">
            Start Building Your Identity
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
            Join creators, developers, artists, and innovators shaping the next
            generation of digital presence.
          </p>

          <div className="mt-8">
            <Link href="/auth/sign-up">
              <Button className="h-12 rounded-2xl bg-white px-8 text-base font-bold text-gray-900 hover:bg-gray-100">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center md:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="FaceForge"
              width={38}
              height={38}
              className="rounded-lg"
            />

            <div className="text-left">
              <h3 className="font-bold">FaceForge</h3>
              <p className="text-xs text-gray-400">
                Forge your digital future
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            © 2025 FaceForge. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}