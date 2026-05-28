'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, Bell, Heart, MessageCircle, UserPlus,
  Flame, Zap, AtSign, Star, Newspaper, X, Check,
  CheckCheck, Loader2, ChevronRight, Settings, LogOut,
  User, Home, Hash, Bookmark, CircleUser, Menu,
  CreditCard, HelpCircle, Shield, Sparkles, Gem, Award,
  Compass, Video
} from 'lucide-react'

// --- Types, helpers, NotifItem, NotificationCenter (keep your existing code) ---
// ... (keep all your existing types, timeAgo, KIND_META, fetchAllNotifications, NotifItem, NotificationCenter exactly as they are)

// --- Main Header with Hamburger Menu Drawer ---

export default function DashboardHeader({
  activeTab,
  onTabChange,
  userId,
}: {
  activeTab: 'forYou' | 'following'
  onTabChange: (tab: 'forYou' | 'following') => void
  userId?: string
}) {
  const supabase = createClient()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Scroll effect
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Load profile for avatar
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('avatar_url, display_name, username, email').eq('id', userId).single()
      .then(({ data }) => setProfile(data))
  }, [userId, supabase])

  // Unread count polling
  useEffect(() => {
    if (!userId) return
    const loadCount = async () => {
      try {
        const notifs = await fetchAllNotifications(supabase, userId)
        setUnreadCount(notifs.filter(n => !n.read).length)
      } catch {}
    }
    loadCount()
    const interval = setInterval(loadCount, 90_000)
    return () => clearInterval(interval)
  }, [userId, supabase])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node) && showNotifs) setShowNotifs(false)
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node) && showDrawer) setShowDrawer(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifs, showDrawer])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showDrawer) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showDrawer])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  // Desktop navigation items (same as bottom nav)
  const desktopNavItems = [
    { icon: Home, label: 'Home', href: '/dashboard', active: activeTab === 'forYou' },
    { icon: Compass, label: 'Discover', href: '/discover', active: false },
    { icon: Video, label: 'Fleex', href: '/fleex', active: false },
    { icon: MessageCircle, label: 'Messages', href: '/messages', active: false },
    { icon: User, label: 'Profile', href: `/profile/${profile?.username || 'me'}`, active: false },
  ]

  // Drawer menu items
  const drawerMenuItems = [
    { icon: User, label: 'Profile', href: `/profile/${profile?.username || 'me'}`, color: 'text-orange-500' },
    { icon: CreditCard, label: 'Subscription', href: '/dashboard/subscription', color: 'text-pink-500', badge: 'Pro' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'text-purple-600' },
    { icon: Gem, label: 'Premium Features', href: '/dashboard/premium', color: 'text-amber-500' },
    { icon: Bookmark, label: 'Saved', href: '/dashboard/saved', color: 'text-blue-500' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support', color: 'text-orange-500' },
    { icon: Shield, label: 'Privacy & Security', href: '/dashboard/privacy', color: 'text-purple-500' },
  ]

  return (
    <>
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-black/5 border-b border-gray-200/50' 
          : 'bg-white/80 backdrop-blur-sm border-b border-gray-100'
      }`}>
        {/* Animated gradient top bar */}
        <div className="h-0.5 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 animate-gradient-x w-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16 gap-4">
            
            {/* Left - Hamburger Menu Button (mobile only) */}
            <button
              onClick={() => setShowDrawer(true)}
              className="lg:hidden flex-shrink-0 flex flex-col gap-1.5 p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-200"
              aria-label="Open menu"
            >
              <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all" />
              <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all" />
              <div className="w-5 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all" />
            </button>

            {/* Logo - Desktop only */}
            <Link href="/dashboard" className="hidden lg:flex items-center gap-1 flex-shrink-0">
              <span className="text-xl font-black text-gray-900">Fleex</span>
              <span className="text-orange-500 text-xl">.</span>
            </Link>

            {/* Desktop Navigation - Shows on desktop, hidden on mobile */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    item.active
                      ? 'bg-gradient-to-r from-orange-50 to-purple-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${item.active ? 'text-orange-500' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Search Bar – Desktop only */}
            <div className="hidden lg:block flex-1 max-w-md">
              <div className={`relative w-full transition-all duration-200 ${
                searchFocused ? 'scale-[1.02]' : ''
              }`}>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className={`h-4 w-4 transition-colors ${searchFocused ? 'text-orange-500' : 'text-gray-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search fleex, creators..."
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-white border border-transparent focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all text-sm placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Right Actions - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Notifications */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                    showNotifs 
                      ? 'bg-orange-50 text-orange-500 ring-2 ring-orange-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Bell className={`h-5 w-5 ${unreadCount > 0 && !showNotifs ? 'animate-wiggle' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && userId && (
                  <NotificationCenter userId={userId} onClose={() => { setShowNotifs(false); setUnreadCount(0); }} />
                )}
              </div>

              {/* Create Post Button */}
              <Link href="/create-fleex">
                <button className="flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:shadow-lg hover:shadow-orange-200/50 hover:scale-105 active:scale-95 transition-all duration-200">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </button>
              </Link>

              {/* Profile Avatar */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-orange-300 transition-all duration-200"
                >
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="avatar" width={36} height={36} className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-purple-500 text-white font-bold text-sm">
                      {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                    <div className="p-3 border-b border-gray-100">
                      <p className="font-bold text-sm text-gray-900">{profile?.display_name || 'User'}</p>
                      <p className="text-xs text-gray-500">@{profile?.username || 'username'}</p>
                    </div>
                    <div className="py-1">
                      <Link href={`/profile/${profile?.username}`} onClick={() => setShowProfileMenu(false)}>
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition cursor-pointer">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Profile</span>
                        </div>
                      </Link>
                      <Link href="/settings" onClick={() => setShowProfileMenu(false)}>
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition cursor-pointer">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Settings</span>
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition cursor-pointer text-red-500">
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm font-medium">Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Right Icons - Only visible on mobile */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Mobile Search */}
              <Link href="/search">
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition active:scale-95">
                  <Search className="h-5 w-5" />
                </button>
              </Link>

              {/* Mobile Notifications (simplified) */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-3.5 px-1 rounded-full bg-orange-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && userId && (
                  <NotificationCenter userId={userId} onClose={() => { setShowNotifs(false); setUnreadCount(0); }} />
                )}
              </div>

              {/* Mobile Create Button */}
              <Link href="/create-fleex">
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white active:scale-95 transition">
                  <Plus className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Tabs – Only visible on desktop, hidden on mobile */}
          <div className="hidden lg:flex items-center gap-1 -mb-px">
            {(['forYou', 'following'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`relative px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab 
                    ? 'text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 rounded-t-lg'
                }`}
              >
                {tab === 'forYou' ? 'For You' : 'Following'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full animate-slide-up" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      {showDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setShowDrawer(false)}
        />
      )}

      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          showDrawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 via-pink-50/50 to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Fleex</h2>
              <p className="text-xs text-gray-500">create, share & discover</p>
            </div>
          </div>
          <button
            onClick={() => setShowDrawer(false)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* User Info */}
        {profile && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt="avatar" 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-300"
                  unoptimized 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                  {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {profile?.display_name || profile?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">@{profile?.username || 'username'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {drawerMenuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setShowDrawer(false)}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-red-50 transition-colors group"
          >
            <LogOut className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-red-600 font-medium">Sign Out</span>
          </button>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] text-gray-400">Version 1.0.0</p>
            <p className="text-[10px] text-gray-400">© 2026 Fleex</p>
          </div>
        </div>
      </div>

      {/* Global animations */}
      <style jsx global>{`
        @keyframes wiggle {
          0%, 90%, 100% { transform: rotate(0deg); }
          92% { transform: rotate(-12deg); }
          96% { transform: rotate(12deg); }
          98% { transform: rotate(-6deg); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes slide-up {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-wiggle { animation: wiggle 2s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
        .animate-slide-down { animation: slide-down 0.15s ease-out; }
      `}</style>
    </>
  )
}
