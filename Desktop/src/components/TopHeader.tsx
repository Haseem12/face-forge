'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, Plus, Menu, X, User, CreditCard, Settings, LogOut, HelpCircle, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  // Hide on auth pages and onboarding
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/onboarding') || pathname === '/') {
    return null
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isDrawerOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setIsDrawerOpen(false)
  }

  const menuItems = [
    { icon: User, label: 'Profile', href: '/dashboard/profile', color: 'text-orange-500' },
    { icon: CreditCard, label: 'Subscription', href: '/dashboard/subscription', color: 'text-pink-500' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'text-purple-600' },
    { icon: Sparkles, label: 'Premium Features', href: '/dashboard/premium', color: 'text-amber-500' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support', color: 'text-orange-500' },
    { icon: Shield, label: 'Privacy', href: '/dashboard/privacy', color: 'text-purple-500' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Hamburger Menu only */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col gap-1.5 p-2 -ml-2 rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-all duration-200"
            aria-label="Open menu"
          >
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transform transition-all" />
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transform transition-all" />
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transform transition-all" />
          </button>

          {/* Center - Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
              <input
                type="text"
                placeholder="Search forges, creators..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-orange-50/50 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-orange-50">
              <Bell className="h-5 w-5 text-orange-500" />
            </Button>
            <Link href="/dashboard/forges/create">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white shadow-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar - Below header on mobile */}
      <div className="md:hidden sticky top-[57px] z-30 bg-white border-b border-orange-100 px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
          <input
            type="text"
            placeholder="Search forges, creators..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-orange-50/50 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with FaceForge branding */}
        <div className="flex items-center justify-between p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50/50 via-pink-50/50 to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-600 to-purple-700 text-lg">
                FaceForge
              </h2>
              <p className="text-xs text-gray-500">build your identity</p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50/30 to-purple-50/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items with FaceForge colors */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-purple-50 transition-colors group"
            >
              <div className={`${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-orange-100 p-4 space-y-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-red-50 transition-colors group"
          >
            <LogOut className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-red-600 font-medium">Sign Out</span>
          </button>
          <p className="text-xs text-center text-gray-400 pt-2">
            Version 1.0.0 • © 2026 FaceForge
          </p>
        </div>
      </div>
    </>
  )
}
