'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Bell, Sparkles, GitBranch, Users, TrendingUp, 
  Megaphone, CheckCircle, AlertCircle, ArrowRight,
  Play, Eye, Heart, MessageCircle, Share2, Plus,
  Crown, Flame, Zap, Clock
} from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { createClient } from '@/lib/supabase/client'

interface UpdateItem {
  id: string
  type: 'story' | 'channel_post' | 'announcement' | 'sponsored' | 'trending'
  title: string
  message: string
  created_at: string
  read: boolean
  image?: string
  author?: {
    id: string
    name: string
    username: string
    avatar?: string
    isVerified?: boolean
  }
  actionLink?: string
  actionText?: string
  views?: number
  likes?: number
  comments?: number
}

export default function UpdatesTab() {
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'channels' | 'trending'>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchUpdates()
    fetchStories()
  }, [])

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      // Fetch from your API
      const response = await fetch('/api/updates')
      const data = await response.json()
      setUpdates(data.updates || mockUpdates)
    } catch (error) {
      console.error('Failed to fetch updates:', error)
      setUpdates(mockUpdates)
    } finally {
      setLoading(false)
    }
  }

  const fetchStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('stories')
        .select('id, user_id, media_url, created_at, profiles!user_id(display_name, username, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      setStories(data || [])
    } catch (error) {
      console.error('Failed to fetch stories:', error)
    }
  }

  const getUpdateIcon = (type: UpdateItem['type']) => {
    switch (type) {
      case 'story':
        return <Play className="h-4 w-4 text-purple-500" />
      case 'channel_post':
        return <Megaphone className="h-4 w-4 text-orange-500" />
      case 'announcement':
        return <Bell className="h-4 w-4 text-blue-500" />
      case 'sponsored':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'trending':
        return <Flame className="h-4 w-4 text-red-500" />
      default:
        return <Sparkles className="h-4 w-4 text-gray-500" />
    }
  }

  const getUpdateBg = (type: UpdateItem['type']) => {
    switch (type) {
      case 'channel_post':
        return 'bg-orange-50 border-orange-100'
      case 'announcement':
        return 'bg-blue-50 border-blue-100'
      case 'sponsored':
        return 'bg-yellow-50 border-yellow-100'
      case 'trending':
        return 'bg-red-50 border-red-100'
      default:
        return 'bg-white border-gray-100'
    }
  }

  const unreadCount = updates.filter(u => !u.read).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Updates</h1>
          <p className="text-sm text-gray-500">Stories, channels, and trending content</p>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-1 text-xs font-bold text-white bg-orange-500 rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Stories Row - Like WhatsApp Status */}
      <div className="mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-2">
          {/* Your Story Button */}
          <Link href="/stories/create">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-orange-300 bg-orange-50 flex items-center justify-center cursor-pointer hover:border-orange-400 transition">
                <Plus className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">Your story</span>
            </div>
          </Link>

          {/* Friend Stories */}
          {stories.map((story) => (
            <button key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full ring-2 ring-gradient-to-r from-orange-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                    {story.profiles?.avatar_url ? (
                      <Image
                        src={story.profiles.avatar_url}
                        alt={story.profiles.display_name}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {story.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <span className="text-[10px] text-gray-500 font-medium max-w-[60px] truncate">
                {story.profiles?.display_name?.split(' ')[0] || 'User'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs - Like WhatsApp Channel filters */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[
          { id: 'all', label: 'All Updates', icon: Sparkles },
          { id: 'channels', label: 'Channels', icon: Megaphone },
          { id: 'trending', label: 'Trending', icon: Flame }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition border-b-2 ${
              selectedFilter === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Updates Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : updates.filter(u => 
        selectedFilter === 'all' || 
        (selectedFilter === 'channels' && ['channel_post', 'announcement'].includes(u.type)) ||
        (selectedFilter === 'trending' && u.type === 'trending')
      ).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">No updates yet</h3>
          <p className="text-sm text-gray-500">Follow channels to see updates here</p>
          <Link href="/discover">
            <button className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-medium rounded-full">
              Discover channels
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sponsored/Ad Section - Like WhatsApp Ads */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sponsored</span>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Build Better Forges</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Learn advanced techniques from top creators</p>
                  <button className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700">
                    Learn more →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Regular Updates */}
          {updates
            .filter(u => 
              selectedFilter === 'all' || 
              (selectedFilter === 'channels' && ['channel_post', 'announcement'].includes(u.type)) ||
              (selectedFilter === 'trending' && u.type === 'trending')
            )
            .map((update) => (
              <div
                key={update.id}
                className={`rounded-xl border p-4 transition hover:shadow-md ${getUpdateBg(update.type)} ${!update.read ? 'ring-1 ring-orange-200' : ''}`}
              >
                <div className="flex gap-3">
                  {/* Author Avatar */}
                  {update.author && (
                    <Link href={`/profile/${update.author.username}`}>
                      <div className="flex-shrink-0">
                        {update.author.avatar ? (
                          <Image
                            src={update.author.avatar}
                            alt={update.author.name}
                            width={44}
                            height={44}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold">
                            {update.author.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    </Link>
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        {update.author && (
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${update.author.username}`}>
                              <span className="font-bold text-gray-900 hover:text-orange-600 transition">
                                {update.author.name}
                              </span>
                            </Link>
                            {update.author.isVerified && (
                              <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span className="text-xs text-gray-400">· {timeAgo(update.created_at)}</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900 mt-1">{update.title}</h3>
                        <p className="text-sm text-gray-600 mt-0.5">{update.message}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {getUpdateIcon(update.type)}
                      </div>
                    </div>
                    
                    {/* Engagement stats */}
                    {(update.views || update.likes || update.comments) && (
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        {update.views && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {update.views.toLocaleString()}
                          </span>
                        )}
                        {update.likes && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {update.likes.toLocaleString()}
                          </span>
                        )}
                        {update.comments && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {update.comments.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    {update.actionLink && (
                      <div className="mt-3">
                        <Link href={update.actionLink}>
                          <button className="text-xs font-medium text-orange-500 hover:text-orange-600 flex items-center gap-1">
                            {update.actionText || 'View update'}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// Mock data
const mockUpdates: UpdateItem[] = [
  {
    id: '1',
    type: 'channel_post',
    title: 'New video: Advanced Forge Techniques',
    message: 'Learn how to optimize your forges for better performance',
    created_at: new Date().toISOString(),
    read: false,
    author: {
      id: 'channel1',
      name: 'FaceForge Official',
      username: 'faceforge',
      avatar: null,
      isVerified: true
    },
    actionLink: '/watch/1',
    actionText: 'Watch now',
    views: 1234,
    likes: 89,
    comments: 12
  },
  {
    id: '2',
    type: 'trending',
    title: 'AI Art Generator is trending',
    message: 'This forge has gained 1,000+ views in the last hour',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    author: {
      id: 'creator1',
      name: 'Sarah Chen',
      username: 'sarahc',
      avatar: null,
      isVerified: false
    },
    actionLink: '/spark/forge-1',
    actionText: 'View forge',
    views: 10456,
    likes: 234,
    comments: 45
  },
  {
    id: '3',
    type: 'announcement',
    title: '📢 Platform Update',
    message: 'New collaboration features are now available for all forges!',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionLink: '/updates/collaboration',
    actionText: 'Learn more'
  },
  {
    id: '4',
    type: 'channel_post',
    title: 'Creator Spotlight: Web Design Masters',
    message: 'Check out this amazing portfolio forge',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    author: {
      id: 'channel2',
      name: 'Design Weekly',
      username: 'designweekly',
      avatar: null,
      isVerified: true
    },
    views: 5678,
    likes: 123,
    comments: 8
  }
]
