'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/spark', icon: Flame, label: 'Spark' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  // Hide on auth pages or non-app pages
  if (pathname?.startsWith('/auth/') || pathname === '/') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/')
          
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition ${
                isActive
                  ? 'text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
