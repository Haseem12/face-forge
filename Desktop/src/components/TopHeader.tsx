'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, Plus, Menu, X, User, CreditCard, Settings, LogOut, HelpCircle, Shield, Sparkles, Flame } from 'lucide-react'
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
    { icon: Flame, label: 'Fleex Studio', href: '/create-fleex', color: 'text-orange-500' },
    { icon: Sparkles, label: 'Premium Features', href: '/dashboard/premium', color: 'text-amber-500' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support', color: 'text-orange-500' },
    { icon: Shield, label: 'Privacy', href: '/dashboard/privacy', color: 'text-purple-500' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Hamburger Menu only */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col gap-1.5 p-2 -ml-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all duration-200"
            aria-label="Open menu"
          >
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full transform transition-all" />
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full transform transition-all" />
            <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full transform transition-all" />
          </button>

          {/* Logo - Center on mobile, left on desktop */}
          <div className="absolute left-1/2 transform -translate-x-1/2 lg:relative lg:left-0 lg:transform-none lg:ml-2">
            <Link href="/dashboard">
              <div className="flex items-center gap-1">
                <span className="text-white font-black text-xl">Fleex</span>
                <span className="text-orange-500 font-black text-xl">.</span>
              </div>
            </Link>
          </div>

          {/* Center - Search (Desktop only) */}
          <div className="hidden lg:block flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
              <input
                type="text"
                placeholder="Search fleex, creators..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-black/50 transition text-white placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-white/10">
              <Bell className="h-5 w-5 text-orange-400" />
            </Button>
            <Link href="/create-fleex">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg shadow-orange-500/20">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar - Below header on mobile */}
      <div className="lg:hidden sticky top-[57px] z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400" />
          <input
            type="text"
            placeholder="Search fleex, creators..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-black/50 transition text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm bg-gradient-to-b from-gray-900 to-black shadow-2xl transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with Fleex branding */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">
                Fleex
              </h2>
              <p className="text-xs text-white/50">create, share & discover</p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-orange-500/5 to-purple-600/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-white/50 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
            >
              <div className={`${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-white/80 group-hover:text-white font-medium">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-red-500/10 transition-colors group"
          >
            <LogOut className="h-5 w-5 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-red-400 font-medium">Sign Out</span>
          </button>
          <p className="text-xs text-center text-white/30 pt-2">
            Fleex • Create, share & discover
          </p>
        </div>
      </div>
    </>
  )
}
