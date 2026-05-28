// app/dashboard/premium/page.tsx
'use client'

import { Crown, Zap, Users, BarChart, Rocket, Shield, Check, Sparkles, Video, Music, Palette, Globe } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import Link from 'next/link'

export default function PremiumPage() {
  const features = [
    { icon: Zap, title: 'Unlimited Forges', description: 'Create as many micro-apps as you want', color: 'from-yellow-500 to-orange-500' },
    { icon: BarChart, title: 'Advanced Analytics', description: 'Deep insights into your audience', color: 'from-green-500 to-emerald-500' },
    { icon: Users, title: 'Team Collaboration', description: 'Work together with your team', color: 'from-blue-500 to-cyan-500' },
    { icon: Rocket, title: 'Priority Support', description: '24/7 dedicated support channel', color: 'from-purple-500 to-pink-500' },
    { icon: Shield, title: 'Custom Domain', description: 'Use your own domain name', color: 'from-indigo-500 to-purple-500' },
    { icon: Video, title: 'HD Video Uploads', description: 'Upload high-quality videos', color: 'from-red-500 to-pink-500' },
    { icon: Music, title: 'Custom Music Library', description: 'Access premium soundtracks', color: 'from-teal-500 to-green-500' },
    { icon: Palette, title: 'Advanced Customization', description: 'Full CSS & branding control', color: 'from-rose-500 to-orange-500' },
    { icon: Globe, title: 'Global Distribution', description: 'Reach audiences worldwide', color: 'from-blue-500 to-indigo-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/10 to-purple-500/10 mb-4">
            <Crown className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">Premium Features</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Unlock your creative potential
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Get access to exclusive tools and features that will take your content to the next level
          </p>
          <Link href="/dashboard/subscription">
            <button className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-bold hover:shadow-lg transition">
              Upgrade to Pro
            </button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 text-center border-b border-gray-200">
            <h2 className="font-bold text-gray-900">Compare plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-900">Feature</th>
                  <th className="p-4 text-center font-semibold text-gray-900">Free</th>
                  <th className="p-4 text-center font-semibold text-orange-600 bg-orange-50">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-4 text-gray-600">Number of forges</td>
                  <td className="p-4 text-center text-gray-500">3</td>
                  <td className="p-4 text-center text-orange-600 font-semibold">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-4 text-gray-600">Analytics</td>
                  <td className="p-4 text-center text-gray-500">Basic</td>
                  <td className="p-4 text-center text-orange-600 font-semibold">Advanced</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-600">Support</td>
                  <td className="p-4 text-center text-gray-500">Community</td>
                  <td className="p-4 text-center text-orange-600 font-semibold">Priority 24/7</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-4 text-gray-600">Custom domain</td>
                  <td className="p-4 text-center text-gray-500">❌</td>
                  <td className="p-4 text-center text-orange-600">✅</td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-600">Team members</td>
                  <td className="p-4 text-center text-gray-500">1</td>
                  <td className="p-4 text-center text-orange-600">Up to 10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
