// app/dashboard/support/page.tsx
'use client'

import { useState } from 'react'
import { HelpCircle, Mail, MessageCircle, BookOpen, Video, Users, ChevronRight, Search, Send, Sparkles, ChevronLeft, Headphones, FileText, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SupportPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const quickActions = [
    { icon: Headphones, label: 'Contact Support', color: 'from-orange-500 to-purple-600' },
    { icon: FileText, label: 'FAQs', color: 'from-blue-500 to-cyan-500' },
    { icon: MessageSquare, label: 'Community', color: 'from-green-500 to-emerald-500' },
  ]

  const faqs = [
    { q: 'How do I create a forge?', a: 'Tap the + button and select "Create Forge"' },
    { q: 'How do I get more followers?', a: 'Share quality content and engage with others' },
    { q: 'What are premium features?', a: 'Unlimited forges, analytics, and more' },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">Help & Support</h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <button key={i} className="bg-white/5 rounded-xl p-4 text-center active:scale-95 transition">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center mx-auto mb-2`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-white text-xs font-medium">{action.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="px-4">
        <p className="text-white/40 text-xs font-semibold mb-3">FREQUENTLY ASKED</p>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium mb-1">{faq.q}</p>
              <p className="text-white/40 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-bold active:scale-95 transition">
          Contact Support
        </button>
      </div>
    </div>
  )
}
