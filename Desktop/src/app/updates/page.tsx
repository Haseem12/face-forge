'use client'

import { useEffect, useState } from 'react'
import { Flame, Sparkles, UserPlus, MessageCircle, Heart, Zap, Clock, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/dashboard/helpers'

interface Update {
  id: string
  type: 'forge_created' | 'forge_updated' | 'comment' | 'like' | 'follow' | 'achievement' | 'trending'
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  target?: {
    id: string
    title: string
    type: 'forge' | 'news'
  }
  message: string
  created_at: string
  metadata?: any
}

export default function UpdatesTab() {
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'forges' | 'social' | 'achievements'>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchUpdates()
  }, [])

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      // Fetch notifications from your API
      const response = await fetch('/api/notifications?limit=50')
      const data = await response.json()
      setUpdates(data.notifications || [])
    } catch (error) {
      console.error('Failed to fetch updates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUpdateIcon = (type: Update['type']) => {
    switch (type) {
      case 'forge_created':
        return <Sparkles className="h-4 w-4 text-purple-500" />
      case 'forge_updated':
        return <Zap className="h-4 w-4 text-orange-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'achievement':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-pink-500" />
      default:
        return <Flame className="h-4 w-4 text-orange-500" />
    }
  }

  const getUpdateBackground = (type: Update['type']) => {
    switch (type) {
      case 'forge_created':
        return 'bg-purple-50 border-purple-100'
      case 'forge_updated':
        return 'bg-orange-50 border-orange-100'
      case 'comment':
        return 'bg-blue-50 border-blue-100'
      case 'like':
        return 'bg-red-50 border-red-100'
      case 'follow':
        return 'bg-green-50 border-green-100'
      case 'achievement':
        return 'bg-yellow-50 border-yellow-100'
      default:
        return 'bg-gray-50 border-gray-100'
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Updates</h1>
        <p className="text-sm text-gray-500">What's happening in your network</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: 'All', icon: Flame },
          { id: 'forges', label: 'Forges', icon: Sparkles },
          { id: 'social', label: 'Social', icon: MessageCircle },
          { id: 'achievements', label: 'Achievements', icon: Star }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Updates Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <Flame className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No updates yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            When people interact with your content or create new forges, you'll see it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates
            .filter(u => filter === 'all' || 
              (filter === 'forges' && ['forge_created', 'forge_updated'].includes(u.type)) ||
              (filter === 'social' && ['comment', 'like', 'follow'].includes(u.type)) ||
              (filter === 'achievements' && u.type === 'achievement'))
            .map((update) => (
              <div
                key={update.id}
                className={`rounded-xl border p-4 transition hover:shadow-md ${getUpdateBackground(update.type)}`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <Link href={`/profile/${update.user.username}`}>
                    <div className="flex-shrink-0">
                      {update.user.avatar ? (
                        <Image
                          src={update.user.avatar}
                          alt={update.user.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {update.user.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/profile/${update.user.username}`}>
                          <span className="font-bold text-gray-900 hover:text-orange-600 transition">
                            {update.user.name}
                          </span>
                        </Link>
                        <span className="text-gray-600 text-sm ml-1">{update.message}</span>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {getUpdateIcon(update.type)}
                      </div>
                    </div>

                    {update.target && (
                      <Link href={`/spark/${update.target.id}`}>
                        <div className="mt-2 p-3 bg-white/50 rounded-lg border border-gray-100 hover:border-orange-200 transition cursor-pointer">
                          <p className="text-sm font-medium text-gray-800">
                            {update.target.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {update.target.type === 'forge' ? 'Forge' : 'Article'}
                          </p>
                        </div>
                      </Link>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{timeAgo(update.created_at)}</span>
                      {update.type === 'forge_created' && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Weekly Digest Section */}
      {!loading && updates.length > 0 && (
        <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-xl border border-orange-100">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-orange-500" />
            <h3 className="font-bold text-gray-900 text-sm">This Week's Digest</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
                {updates.filter(u => u.type === 'like').length}
              </div>
              <p className="text-xs text-gray-600">Likes received</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
                {updates.filter(u => u.type === 'comment').length}
              </div>
              <p className="text-xs text-gray-600">Comments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
                {updates.filter(u => u.type === 'follow').length}
              </div>
              <p className="text-xs text-gray-600">New allies</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-transparent bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text">
                {updates.filter(u => u.type === 'forge_created').length}
              </div>
              <p className="text-xs text-gray-600">New forges</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
