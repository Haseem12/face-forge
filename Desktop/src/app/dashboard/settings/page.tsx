// app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { Bell, Lock, Palette, Globe, Moon, Sun, User, Mail, Shield, ChevronRight, ChevronLeft, Circle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [privateAccount, setPrivateAccount] = useState(false)

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile Information', subtitle: 'Name, username, bio' },
        { icon: Mail, label: 'Email Address', subtitle: 'haseemsg@gmail.com' },
        { icon: Lock, label: 'Password', subtitle: 'Last changed 2 months ago' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Palette, label: 'Appearance', subtitle: darkMode ? 'Dark mode' : 'Light mode', toggle: true, value: darkMode, onToggle: setDarkMode },
        { icon: Globe, label: 'Language', subtitle: 'English', rightIcon: true },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Push Notifications', subtitle: 'Get alerts', toggle: true, value: notifications, onToggle: setNotifications },
      ]
    },
    {
      title: 'Privacy',
      items: [
        { icon: Shield, label: 'Private Account', subtitle: 'Only followers can see your content', toggle: true, value: privateAccount, onToggle: setPrivateAccount },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">Settings</h1>
        </div>
      </div>

      {/* Settings List */}
      <div className="divide-y divide-white/10">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="px-4 py-3">
            <p className="text-white/40 text-xs font-semibold mb-2 tracking-wider">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <div
                  key={i}
                  onClick={() => item.rightIcon && router.push(`/settings/${item.label.toLowerCase().replace(/\s/g, '-')}`)}
                  className={`flex items-center justify-between py-3 ${item.rightIcon ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-white/40 text-xs">{item.subtitle}</p>
                    </div>
                  </div>
                  {item.toggle ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); item.onToggle(!item.value) }}
                      className={`w-11 h-6 rounded-full transition ${item.value ? 'bg-orange-500' : 'bg-white/20'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition ${item.value ? 'ml-5' : 'ml-0.5'}`} />
                    </button>
                  ) : item.rightIcon ? (
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
