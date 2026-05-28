// app/dashboard/privacy/page.tsx
'use client'

import { Shield, Eye, Lock, Database, Globe, Clock, CheckCircle, Bell, User, Key, Fingerprint, ChevronLeft, Circle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function PrivacyPage() {
  const router = useRouter()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [privateAccount, setPrivateAccount] = useState(true)

  const privacySettings = [
    { icon: Eye, label: 'Private Account', description: 'Only followers can see your content', value: privateAccount, onToggle: setPrivateAccount },
    { icon: Key, label: 'Two-Factor Authentication', description: 'Extra security layer', value: twoFactorEnabled, onToggle: setTwoFactorEnabled },
    { icon: Database, label: 'Download Your Data', description: 'Get a copy of your information', rightIcon: true },
    { icon: Lock, label: 'Change Password', description: 'Update your password', rightIcon: true },
    { icon: Fingerprint, label: 'Biometric Login', description: 'Use Face ID / Fingerprint', toggle: true, value: false },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">Privacy & Security</h1>
        </div>
      </div>

      {/* Settings */}
      <div className="divide-y divide-white/10">
        {privacySettings.map((item, i) => (
          <div key={i} className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-white/40 text-xs">{item.description}</p>
              </div>
            </div>
            {'toggle' in item ? (
              <button
                onClick={() => item.onToggle(!item.value)}
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

      {/* Danger Zone */}
      <div className="mt-6 px-4">
        <p className="text-white/40 text-xs font-semibold mb-3">DANGER ZONE</p>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 font-medium">Delete Account</p>
              <p className="text-red-400/50 text-xs">Permanently delete your account</p>
            </div>
            <button className="px-4 py-2 bg-red-500/20 rounded-full text-red-400 text-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
