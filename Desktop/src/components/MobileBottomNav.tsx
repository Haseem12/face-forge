'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Search, Smile, Bell, CircleUser } from 'lucide-react'
import Image from 'next/image'

export default function MobileBottomNav() {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Hide on auth, onboarding, or landing pages
  if (!user || pathname?.startsWith('/auth/') || pathname?.startsWith('/onboarding') || pathname === '/') {
    return null
  }

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Feed' },
    { href: '/search', icon: Search, label: 'Discover' },
    { href: '/updates', icon: Smile, label: 'Updates', badge: true },
    { href: '/activity', icon: Bell, label: 'Activity' },
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
                
                {/* Notification Badge */}
                {badge && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-bold tracking-tight transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}