'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, ArrowLeft } from 'lucide-react'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
}

function SearchContent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery) {
      setQuery(initialQuery)
      performSearch(initialQuery)
    }
  }, [searchParams])

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
    performSearch(query)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search creators, forges..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg"
            />
            <Button type="submit" size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Found {results.length} creator{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((profile) => (
              <Link key={profile.id} href={`/profile/${profile.username}`}>
                <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors">
                  <Avatar className="h-12 w-12">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback>{profile.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{profile.display_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
                    {profile.bio && <p className="text-sm mt-1 line-clamp-2">{profile.bio}</p>}
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              </Link>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No creators found</h3>
            <p className="text-muted-foreground">Try searching for different keywords</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Search for creators</h3>
            <p className="text-muted-foreground">Find and follow creators in FaceForge</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchContent />
    </Suspense>
  )
}
