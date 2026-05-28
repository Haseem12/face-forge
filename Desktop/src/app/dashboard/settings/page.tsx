// app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { Bell, Lock, Eye, Palette, Globe, Smartphone, Moon, Sun, User, Mail, Shield, ChevronRight } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  const settingsSections = [
    {
      title: 'Account',
      icon: User,
      color: 'text-orange-500',
      items: [
        { label: 'Profile Information', description: 'Update your personal info', href: '/settings/profile' },
        { label: 'Email Address', description: 'Change your email', href: '/settings/email' },
        { label: 'Password', description: 'Update your password', href: '/settings/password' },
      ]
    },
    {
      title: 'Preferences',
      icon: Palette,
      color: 'text-purple-500',
      items: [
        { label: 'Appearance', description: 'Light / Dark mode', href: '/settings/appearance' },
        { label: 'Language', description: 'Select your preferred language', href: '/settings/language' },
        { label: 'Content Preferences', description: 'Manage your feed', href: '/settings/content' },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      color: 'text-pink-500',
      items: [
        { label: 'Push Notifications', description: 'Get alerts on your device', href: '/settings/push' },
        { label: 'Email Digest', description: 'Weekly summary of activity', href: '/settings/digest' },
        { label: 'Mentions & Tags', description: 'When someone mentions you', href: '/settings/mentions' },
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      color: 'text-blue-500',
      items: [
        { label: 'Privacy Settings', description: 'Control your visibility', href: '/settings/privacy' },
        { label: 'Two-Factor Auth', description: 'Extra security layer', href: '/settings/2fa' },
        { label: 'Connected Apps', description: 'Manage third-party access', href: '/settings/apps' },
        { label: 'Data Export', description: 'Download your data', href: '/settings/export' },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account preferences</p>
        </div>

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <section.icon className={`h-5 w-5 ${section.color}`} />
                <h2 className="font-bold text-gray-900">{section.title}</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {section.items.map((item) => (
                  <div key={item.label} className="p-4 hover:bg-gray-50 transition cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
