'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle, Share2, Plus, Sparkles, Hash, ArrowLeft, CheckCircle } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'

interface FeedPost {
  id: string
  user_id: string
  content: string
  title?: string
  media_url?: string
  media_type?: 'image' | 'video'
  category: string
  tags: string[]
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
}

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-600',
  news: 'bg-red-50 text-red-600',
  entertainment: 'bg-purple-50 text-purple-600',
  gaming: 'bg-green-50 text-green-600',
  sports: 'bg-orange-50 text-orange-600',
  music: 'bg-pink-50 text-pink-600',
  art: 'bg-indigo-50 text-indigo-600',
  business: 'bg-emerald-50 text-emerald-600',
  science: 'bg-cyan-50 text-cyan-600',
  lifestyle: 'bg-rose-50 text-rose-600',
}

export default function FeedsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      router.replace('/dashboard/feeds')
    }
    loadFeeds()
  }, [])

  const loadFeeds = async () => {
    try {
      const { data: postsData } = await supabase
        .from('user_feeds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      setPosts(postsData || [])
      
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds)
        
        const profileMap = new Map()
        profilesData?.forEach(p => profileMap.set(p.id, p))
        setProfiles(profileMap)
      }
    } catch (error) {
      console.error('Error loading feeds:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Post created successfully!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <h1 className="font-semibold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
              Community Feeds
            </h1>
          </div>
          <Link href="/dashboard/feeds/create">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition active:scale-95">
              <Plus className="h-4 w-4" />
              Create
            </button>
          </Link>
        </div>
      </div>

      {/* Feed List */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {posts.map((post) => {
          const profile = profiles.get(post.user_id)
          const categoryColor = CATEGORY_COLORS[post.category] || 'bg-gray-50 text-gray-600'
          
          return (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in"
            >
              {/* Author */}
              <div className="flex items-center gap-3 mb-3">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{profile?.display_name || 'User'}</p>
                  <p className="text-xs text-gray-500">@{profile?.username} · {timeAgo(post.created_at)}</p>
                </div>
              </div>
              
              {/* Category Badge */}
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${categoryColor}`}>
                {post.category}
              </div>
              
              {/* Title */}
              {post.title && (
                <h2 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h2>
              )}
              
              {/* Content */}
              <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
              
              {/* Media */}
              {post.media_url && (
                <div className="mb-3 rounded-xl overflow-hidden bg-gray-100">
                  {post.media_type === 'image' ? (
                    <img src={post.media_url} alt="" className="w-full max-h-96 object-contain" />
                  ) : (
                    <video src={post.media_url} className="w-full max-h-96 object-contain" controls />
                  )}
                </div>
              )}
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs text-orange-500">
                      <Hash className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center justify-around pt-3 border-t border-gray-100">
                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-all hover:scale-105">
                  <Heart className="h-4 w-4" />
                  {post.likes_count || 0}
                </button>
                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-500 transition-all hover:scale-105">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count || 0}
                </button>
                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-500 transition-all hover:scale-105">
                  <Share2 className="h-4 w-4" />
                  {post.shares_count || 0}
                </button>
              </div>
            </div>
          )
        })}
        
        {!loading && posts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No feeds yet</h3>
            <p className="text-gray-500 text-sm">Be the first to share something!</p>
            <Link href="/dashboard/feeds/create">
              <button className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white font-semibold hover:shadow-lg transition">
                Create your first feed
              </button>
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </div>
  )
}