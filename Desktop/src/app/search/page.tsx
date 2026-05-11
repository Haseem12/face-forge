'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, ArrowLeft, UserPlus, UserCheck, Sparkles, TrendingUp, Users, AtSign, Flame } from 'lucide-react'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  forge_count?: number
  follower_count?: number
}

function SearchContent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [trendingSearches, setTrendingSearches] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get current user and their following list
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        
        // Get following list
        const { data: allies } = await supabase
          .from('allies')
          .select('following_id')
          .eq('follower_id', user.id)
        
        if (allies) {
          setFollowing(new Set(allies.map(a => a.following_id)))
        }
      }
    }
    getUser()
  }, [supabase])

  // Load trending searches (mock data - can be replaced with real analytics)
  useEffect(() => {
    setTrendingSearches([
      'Tech Creators', 'AI Artists', 'Web Developers', 
      'UI Designers', 'Content Writers', 'Video Editors'
    ])
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recent_searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5))
    }
  }, [])

  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery) {
      setQuery(initialQuery)
      performSearch(initialQuery)
      addToRecentSearches(initialQuery)
    }
  }, [searchParams])

  const addToRecentSearches = (term: string) => {
    if (!term.trim()) return
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent_searches', JSON.stringify(updated))
  }

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setResults(data.profiles || [])
    } catch (error) {
      console.error('[v0] Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query)
      addToRecentSearches(query)
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  const handleTrendingClick = (term: string) => {
    setQuery(term)
    performSearch(term)
    addToRecentSearches(term)
    router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  const handleFollow = async (userId: string) => {
    if (!currentUserId || followLoading) return
    
    setFollowLoading(userId)
    const wasFollowing = following.has(userId)
    
    // Optimistic update
    if (wasFollowing) {
      following.delete(userId)
    } else {
      following.add(userId)
    }
    setFollowing(new Set(following))
    
    try {
      if (wasFollowing) {
        await fetch('/api/allies', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: userId }),
        })
      } else {
        await fetch('/api/allies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: userId }),
        })
      }
    } catch (error) {
      // Revert on error
      if (wasFollowing) {
        following.add(userId)
      } else {
        following.delete(userId)
      }
      setFollowing(new Set(following))
    } finally {
      setFollowLoading(null)
    }
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recent_searches')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 transition group"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-orange-500 transition" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-black text-gray-900">Search</h1>
              <p className="text-xs text-gray-500">Find creators and forges</p>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, or interests..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-base bg-gray-100 border border-transparent rounded-2xl focus:bg-white focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold rounded-xl px-4 h-9"
            >
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Results Area */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          // Loading skeletons
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-64 mt-2" />
                  </div>
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Found <span className="font-bold text-orange-600">{results.length}</span> creator{results.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Sparkles className="h-3 w-3" />
                <span>FaceForge creators</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {results.map((profile) => {
                const isFollowing = following.has(profile.id)
                const isLoading = followLoading === profile.id
                
                return (
                  <div 
                    key={profile.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <Link href={`/profile/${profile.username}`} className="flex-shrink-0">
                        <div className="relative group">
                          <Avatar className="h-14 w-14 ring-2 ring-white shadow-md">
                            {profile.avatar_url && <AvatarImage src={profile.avatar_url} className="object-cover" />}
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-600 text-white text-lg font-bold">
                              {profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        </div>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${profile.username}`}>
                          <h3 className="font-bold text-gray-900 hover:text-orange-600 transition truncate">
                            {profile.display_name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 truncate">@{profile.username}</p>
                        {profile.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{profile.bio}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {profile.follower_count || 0} allies
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {profile.forge_count || 0} forges
                          </span>
                        </div>
                      </div>
                      
                      {currentUserId && currentUserId !== profile.id ? (
                        <Button
                          onClick={() => handleFollow(profile.id)}
                          disabled={isLoading}
                          className={`rounded-full font-semibold transition-all ${
                            isFollowing
                              ? 'bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50'
                              : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                          }`}
                          size="sm"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isFollowing ? (
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              Allied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <UserPlus className="h-3.5 w-3.5" />
                              Ally
                            </span>
                          )}
                        </Button>
                      ) : currentUserId === profile.id ? (
                        <Button variant="outline" size="sm" className="rounded-full" disabled>
                          You
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : query ? (
          // No results for search term
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              We couldn't find any creators matching "{query}". Try different keywords or browse trending topics below.
            </p>
          </div>
        ) : (
          // Empty state with suggestions
          <div className="space-y-8">
            {/* Trending Searches */}
            {trendingSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-500 to-pink-500" />
                  <h2 className="text-base font-black text-gray-900">Trending Now</h2>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleTrendingClick(term)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 hover:shadow-sm transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-700">Recent Searches</h2>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-400 hover:text-red-500 transition"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleTrendingClick(term)}
                      className="flex items-center gap-3 w-full p-3 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-orange-50 transition">
                        <Search className="h-4 w-4 text-gray-500 group-hover:text-orange-500" />
                      </div>
                      <span className="text-sm text-gray-700 group-hover:text-orange-600">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Discover Message */}
            <div className="text-center pt-8">
              <Flame className="h-12 w-12 text-orange-200 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-800">Discover Amazing Creators</h3>
              <p className="text-sm text-gray-500 mt-1">
                Search for creators by name, username, or interests to connect with them
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
