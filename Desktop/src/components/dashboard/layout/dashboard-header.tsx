'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, Bell, Heart, MessageCircle, UserPlus,
  Flame, Zap, AtSign, Star, Newspaper, X, Check,
  CheckCheck, Loader2, ChevronRight, Settings, LogOut,
  User, Home, Hash, Bookmark, CircleUser,
} from 'lucide-react'

// --- Types, helpers, NotifItem, NotificationCenter (unchanged from your code) ---
// ... (keep all your existing types, timeAgo, KIND_META, fetchAllNotifications, NotifItem, NotificationCenter exactly as they are)

// --- Main Header (Enhanced) ---

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
  const [unreadCount, setUnreadCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Scroll effect – richer shadow + border
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Load profile for avatar
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('avatar_url, display_name, username').eq('id', userId).single()
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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifs])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-black/5 border-b border-gray-200/50' 
        : 'bg-white/80 backdrop-blur-sm border-b border-gray-100'
    }`}>
      {/* Animated gradient top bar */}
      <div className="h-0.5 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 animate-gradient-x w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16 gap-4">
          
          {/* Logo with hover scale */}
          <Link href="/dashboard" className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
            <div className="relative w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">✧</span>
            </div>
          </Link>

          {/* Search Bar – Rich X-style */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className={`relative w-full transition-all duration-200 ${
              searchFocused ? 'scale-[1.02]' : ''
            }`}>
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 transition-colors ${searchFocused ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
              <input
                type="text"
                placeholder="Search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-white border border-transparent focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all text-sm placeholder:text-gray-500"
              />
              {searchFocused && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                  ⌘K
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile search */}
            <Link href="/search" className="md:hidden">
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition active:scale-95">
                <Search className="h-5 w-5" />
              </button>
            </Link>

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

            {/* Create Post Button (like X's "Post" button) */}
            <Link href="/dashboard/forges/create">
              <button className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:shadow-lg hover:shadow-orange-200/50 hover:scale-105 active:scale-95 transition-all duration-200">
                <Plus className="h-3.5 w-3.5" />
                <span>Post</span>
              </button>
            </Link>
            <Link href="/dashboard/forges/create" className="sm:hidden">
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:shadow-lg active:scale-95 transition">
                <Plus className="h-4 w-4" />
              </button>
            </Link>

            {/* Profile Dropdown (new) */}
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
        </div>

        {/* Tabs – X‑style underline animation */}
        <div className="flex items-center gap-1 -mb-px">
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
    </header>
  )
}