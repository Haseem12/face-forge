'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TopHeader() {
  const pathname = usePathname()

  // Hide on auth pages and onboarding
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/onboarding') || pathname === '/') {
    return null
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 hidden md:block">
      <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left - Logo & Tagline */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            F
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">FaceForge</h1>
            <p className="text-xs text-gray-500">build your identity</p>
          </div>
        </Link>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search forges, creators..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
          <Link href="/dashboard/forges/create">
            <Button size="sm" className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
