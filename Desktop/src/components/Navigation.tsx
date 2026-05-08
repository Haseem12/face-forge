'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Home, Search, Bell, LogOut, Smile } from 'lucide-react'
import Image from 'next/image'

export default function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (pathname?.startsWith('/auth/')) return null

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-black text-xl tracking-tighter">
          <div className="bg-gradient-to-tr from-orange-500 to-purple-600 p-1.5 rounded-lg">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="hidden sm:inline bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            FaceForge
          </span>
        </Link>

        {/* Search */}
        {user && (
          <div className="hidden md:flex flex-1 max-w-sm mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <Input
                placeholder="Search creators..."
                className="pl-10 bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-orange-500/20 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Action Icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="icon" className={pathname === '/dashboard' ? 'text-orange-500 bg-gray-50' : 'text-gray-500'}>
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              
              <Link href="/updates">
                <Button variant="ghost" size="icon" className="text-gray-500 relative">
                  <Smile className="h-5 w-5" />
                  <div className="absolute top-2 right-2 h-2 w-2 bg-orange-500 rounded-full border-2 border-white" />
                </Button>
              </Link>

              <Link href={`/profile/${user.user_metadata?.username || 'me'}`}>
                <div className={`h-8 w-8 rounded-full overflow-hidden border-2 transition-all ${
                  pathname?.includes('/profile') ? 'border-orange-500 scale-110' : 'border-gray-100 hover:border-gray-300'
                }`}>
                  <Image 
                    src={user.user_metadata?.avatar_url || 'https://github.com/shadcn.png'} 
                    alt="User" 
                    width={32} 
                    height={32}
                    className="object-cover"
                  />
                </div>
              </Link>

              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" className="font-bold">Login</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 font-bold rounded-xl px-6">
                  Join Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}