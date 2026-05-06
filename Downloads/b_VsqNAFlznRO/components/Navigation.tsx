'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Home, Search, User, LogOut } from 'lucide-react'

export default function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [mounted, supabase])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Hide nav on auth pages
  if (pathname?.startsWith('/auth/')) return null

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-lg">
          <Zap className="h-5 w-5 text-orange-500" />
          <span className="hidden sm:inline">FaceForge</span>
        </Link>

        {/* Search bar */}
        {user && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
        )}

        {/* Navigation links and user menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Nav links */}
              <Link href="/spark">
                <Button variant={pathname === '/spark' ? 'default' : 'ghost'} size="sm" className="gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Spark</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant={pathname === '/dashboard' ? 'default' : 'ghost'} size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">My Forges</span>
                </Button>
              </Link>

              {/* Mobile search button */}
              <Link href="/search" className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </Link>

              {/* Profile menu */}
              <Link href={`/profile/${user.user_metadata?.username || 'profile'}`}>
                <Button variant={pathname?.includes('/profile') ? 'default' : 'ghost'} size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              </Link>

              {/* Logout button */}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
