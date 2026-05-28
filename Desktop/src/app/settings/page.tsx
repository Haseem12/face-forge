// app/settings/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Bell, Shield, HelpCircle, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()

  const settingsItems = [
    { icon: User, label: 'Profile', href: '/settings/profile', description: 'Edit your profile information' },
    { icon: Bell, label: 'Notifications', href: '/settings/notifications', description: 'Manage your notifications' },
    { icon: Shield, label: 'Privacy & Security', href: '/settings/privacy', description: 'Control your privacy settings' },
    { icon: HelpCircle, label: 'Help & Support', href: '/settings/support', description: 'Get help and support' },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-white font-semibold text-lg">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {settingsItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-white/40 text-xs">{item.description}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/40" />
          </button>
        ))}
      </div>
    </div>
  )
}
