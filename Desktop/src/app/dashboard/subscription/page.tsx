// app/dashboard/subscription/page.tsx
'use client'

import { useState } from 'react'
import { Check, Crown, Zap, Shield, Sparkles, Users, Gift, CreditCard, ChevronRight } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import Link from 'next/link'

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      features: [
        'Basic profile customization',
        'Create up to 3 forges',
        'Basic analytics',
        'Community support',
      ],
      color: 'gray',
      buttonText: 'Current Plan',
      disabled: true,
    },
    monthly: {
      name: 'Pro Monthly',
      price: 9.99,
      originalPrice: 19.99,
      description: 'Unlock full creative potential',
      features: [
        'Unlimited forges',
        'Advanced analytics',
        'Priority support',
        'Custom domain',
        'Remove branding',
        'Team collaboration',
      ],
      color: 'orange',
      badge: 'Popular',
    },
    yearly: {
      name: 'Pro Yearly',
      price: 89.99,
      originalPrice: 239.88,
      description: 'Best value - save 62%',
      features: [
        'Everything in Pro Monthly',
        '2 months free',
        'Exclusive badge',
        'Early access to features',
      ],
      color: 'purple',
      badge: 'Best Deal',
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-purple-100 mb-4">
            <Crown className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">Upgrade to Pro</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Choose your plan</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Get unlimited access to premium features and take your content to the next level
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPlan === 'yearly'
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly <span className="text-orange-500 text-xs ml-1">Save 62%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Free</h2>
              <div className="mt-2">
                <span className="text-3xl font-black">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Perfect for getting started</p>
            </div>
            <button
              disabled
              className="w-full py-2 rounded-full bg-gray-100 text-gray-500 text-sm font-medium cursor-default"
            >
              Current Plan
            </button>
            <div className="mt-6 space-y-3">
              {plans.free.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Pro Monthly */}
          <div className="relative bg-white rounded-2xl border-2 border-orange-200 shadow-xl p-6 transform scale-105 hover:scale-110 transition">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full">
                Most Popular
              </span>
            </div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pro Monthly</h2>
              <div className="mt-2">
                <span className="text-3xl font-black">$9.99</span>
                <span className="text-gray-500">/month</span>
                <span className="ml-2 text-sm text-gray-400 line-through">$19.99</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Unlock full creative potential</p>
            </div>
            <button className="w-full py-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition">
              Upgrade Now
            </button>
            <div className="mt-6 space-y-3">
              {plans.monthly.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Pro Yearly */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white hover:shadow-xl transition">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Pro Yearly</h2>
              <div className="mt-2">
                <span className="text-3xl font-black">$89.99</span>
                <span className="text-gray-400">/year</span>
                <div className="text-xs text-green-400 mt-1">Save 62% • 2 months free</div>
              </div>
              <p className="text-sm text-gray-300 mt-2">Best value for serious creators</p>
            </div>
            <button className="w-full py-2 rounded-full bg-white text-gray-900 text-sm font-medium hover:shadow-lg transition">
              Get Best Deal
            </button>
            <div className="mt-6 space-y-3">
              {plans.yearly.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-center">Everything included in Pro</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="h-4 w-4 text-orange-500" />
              Unlimited forges
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-purple-500" />
              Priority support
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 text-blue-500" />
              Team collaboration
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Gift className="h-4 w-4 text-pink-500" />
              Early access features
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
