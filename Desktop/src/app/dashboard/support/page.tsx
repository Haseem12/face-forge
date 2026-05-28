// app/dashboard/support/page.tsx
'use client'

import { useState } from 'react'
import { HelpCircle, Mail, MessageCircle, BookOpen, Video, Users, ChevronRight, Search, Send, Sparkles } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import Link from 'next/link'

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')

  const faqs = [
    { question: 'How do I create my first forge?', answer: 'Click the Create button in the top right corner...' },
    { question: 'How do I get more followers?', answer: 'Share your content, engage with others...' },
    { question: 'What are the premium features?', answer: 'Premium includes unlimited forges, analytics...' },
    { question: 'How do I report inappropriate content?', answer: 'Click the three dots on any post...' },
  ]

  const quickLinks = [
    { icon: BookOpen, label: 'Documentation', description: 'Read our guides', href: '/docs' },
    { icon: Video, label: 'Video Tutorials', description: 'Watch how-to videos', href: '/tutorials' },
    { icon: Users, label: 'Community Forum', description: 'Ask the community', href: '/forum' },
    { icon: Mail, label: 'Email Support', description: 'Contact our team', href: 'mailto:support@fleex.com' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-purple-100 mb-4">
            <HelpCircle className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">Help Center</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">How can we help you?</h1>
          <p className="text-gray-500 max-w-md mx-auto">Find answers, get help, and connect with our team</p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {quickLinks.map((link) => (
            <Link key={link.label} href={link.href}>
              <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-100 to-purple-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                  <link.icon className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{link.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-purple-50">
            <h2 className="font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition cursor-pointer group">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{faq.question}</p>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-5 w-5" />
            <h2 className="font-bold text-lg">Still need help?</h2>
          </div>
          <p className="text-white/80 text-sm mb-4">Our support team is here to assist you</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Describe your issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2 rounded-full text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button className="px-4 py-2 bg-white text-orange-600 rounded-full font-medium hover:shadow-lg transition">
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
