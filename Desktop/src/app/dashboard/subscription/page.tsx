// app/dashboard/subscription/page.tsx
'use client'

import { useState } from 'react'
import { Check, Crown, Zap, Shield, Sparkles, Users, Gift, CreditCard, ChevronRight, Star, TrendingUp, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SubscriptionPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      description: 'Start creating',
      features: ['3 forges', 'Basic analytics', 'Community support'],
      buttonText: 'Current',
      disabled: true,
    },
    monthly: {
      name: 'Pro',
      price: 9.99,
      originalPrice: 19.99,
      description: 'Unlock everything',
      features: ['Unlimited forges', 'Advanced analytics', 'Priority support', 'Custom domain', 'Remove branding'],
      badge: 'Popular',
    },
    yearly: {
      name: 'Pro+',
      price: 89.99,
      originalPrice: 239.88,
      description: 'Best value',
      features: ['Everything in Pro', '2 months free', 'Exclusive badge', 'Early access'],
      badge: 'Best Deal',
    },
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-white rotate-180" />
          </button>
          <h1 className="text-white font-semibold text-lg">Premium</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="px-4 py-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-purple-600/20 mb-4">
          <Crown className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-orange-400">Go Pro</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Unlock Pro</h1>
        <p className="text-white/50 text-sm">Get unlimited access to all features</p>
      </div>

      {/* Plans - Horizontal Scroll */}
      <div className="px-4 pb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 min-w-max">
          {/* Free Plan */}
          <div className="w-80 bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="mb-4">
              <h2 className="text-white font-bold text-lg">Free</h2>
              <div className="mt-2">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-white/40">/month</span>
              </div>
            </div>
            <button disabled className="w-full py-3 rounded-full bg-white/10 text-white/50 text-sm font-medium">
              Current
            </button>
            <div className="mt-5 space-y-2">
              {plans.free.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <Check className="h-4 w-4 text-orange-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Plan */}
          <div className="w-80 bg-gradient-to-b from-orange-500/10 to-purple-600/10 rounded-2xl p-5 border border-orange-500/30 relative">
            <div className="absolute -top-3 left-4">
              <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full">
                Most Popular
              </span>
            </div>
            <div className="mb-4">
              <h2 className="text-white font-bold text-lg">Pro Monthly</h2>
              <div className="mt-2">
                <span className="text-3xl font-black text-white">$9.99</span>
                <span className="text-white/40">/month</span>
              </div>
            </div>
            <button className="w-full py-3 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium active:scale-95 transition">
              Subscribe
            </button>
            <div className="mt-5 space-y-2">
              {plans.monthly.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-orange-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Plan */}
          <div className="w-80 bg-gradient-to-b from-purple-500/10 to-pink-600/10 rounded-2xl p-5 border border-purple-500/30">
            <div className="absolute -top-3 left-4">
              <span className="px-3 py-1 text-xs font-bold bg-purple-500 text-white rounded-full">
                Best Deal
              </span>
            </div>
            <div className="mb-4">
              <h2 className="text-white font-bold text-lg">Pro Yearly</h2>
              <div className="mt-2">
                <span className="text-3xl font-black text-white">$89.99</span>
                <span className="text-white/40">/year</span>
                <div className="text-xs text-green-400 mt-1">Save 62%</div>
              </div>
            </div>
            <button className="w-full py-3 rounded-full bg-white text-black text-sm font-medium active:scale-95 transition">
              Get Best Deal
            </button>
            <div className="mt-5 space-y-2">
              {plans.yearly.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="h-4 w-4 text-green-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="px-4 py-4">
        <h3 className="text-white font-semibold mb-4">✨ Everything included</h3>
        <div className="space-y-3">
          {[
            { icon: Zap, title: 'Unlimited forges', desc: 'Create as many as you want' },
            { icon: TrendingUp, title: 'Advanced analytics', desc: 'Deep insights into your audience' },
            { icon: Users, title: 'Team collaboration', desc: 'Work together with your team' },
            { icon: Rocket, title: 'Priority support', desc: '24/7 dedicated support' },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-white font-medium">{feature.title}</p>
                <p className="text-white/40 text-xs">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
