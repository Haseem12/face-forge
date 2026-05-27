'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Search, Smile, MessageCircle, CircleUser } from 'lucide-react'
import Image from 'next/image'

export default function MobileBottomNav() {
  const [user, setUser] = useState<any>(null)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Fetch unread message count
  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadCount = async () => {
      try {
        // Get all conversations for current user
        const { data: conversations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id)

        const conversationIds = conversations?.map(c => c.conversation_id) || []

        if (conversationIds.length === 0) {
          setUnreadMessageCount(0)
          return
        }

        // Count unread messages (messages not from current user)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('user_id', user.id)

        setUnreadMessageCount(count || 0)
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    fetchUnreadCount()

    // Subscribe to new messages for real-time badge updates
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => fetchUnreadCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user?.id])

  // Hide on auth, onboarding, or landing pages
  if (!user || pathname?.startsWith('/auth/') || pathname?.startsWith('/onboarding') || pathname === '/') {
    return null
  }

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Feed' },
    { href: '/search', icon: Search, label: 'Discover' },
    { href: '/fleex', icon: Smile, label: 'Fleex', badge: true },
    { href: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessageCount > 0 },
    { href: '/profile', icon: CircleUser, label: 'Profile', isProfile: true },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/80 backdrop-blur-lg md:hidden pb-safe">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ href, icon: Icon, label, badge, isProfile }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className="relative flex-1 flex flex-col items-center justify-center py-2 min-w-[64px]"
            >
              {/* Active Pill Background */}
              {isActive && (
                <div className="absolute inset-x-1 inset-y-1 bg-gray-100 rounded-xl -z-10 transition-all duration-300" />
              )}

              <div className="relative">
                {isProfile && user?.user_metadata?.avatar_url ? (
                  <div className={`h-6 w-6 rounded-full overflow-hidden border-2 ${isActive ? 'border-orange-500' : 'border-transparent'}`}>
                    <Image 
                      src={user.user_metadata.avatar_url} 
                      alt="Profile" 
                      width={24} 
                      height={24} 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Icon 
                    className={`h-6 w-6 transition-colors ${
                      isActive ? 'text-orange-500 stroke-[2.5px]' : 'text-gray-500'
                    }`} 
                  />
                )}
                
                {/* Notification Badge - shows for Updates and Messages */}
                {badge && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full border-2 border-white flex items-center justify-center">
                    {href === '/messages' && unreadMessageCount > 0 ? (
                      <span className="text-[8px] font-black text-white">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </span>
                    ) : (
                      <div className="h-1.5 w-1.5 bg-white rounded-full" />
                    )}
                  </div>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-bold tracking-tight transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {label}
                {href === '/messages' && unreadMessageCount > 0 && (
                  <span className="hidden"> ({unreadMessageCount})</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
