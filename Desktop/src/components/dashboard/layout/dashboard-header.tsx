'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, Bell, Heart, MessageCircle, UserPlus,
  Flame, Zap, AtSign, Star, Newspaper, X, Check,
  CheckCheck, Loader2, ChevronRight,
} from 'lucide-react'

// --- Types ---

type NotifKind =
  | 'like'
  | 'comment'
  | 'reply'
  | 'follow'
  | 'mention'
  | 'news_like'
  | 'forge_new'
  | 'news_comment'

interface Notification {
  id: string
  kind: NotifKind
  read: boolean
  created_at: string
  actor: { display_name: string; username: string; avatar_url?: string } | null
  body: string
  href: string
}

// --- Helpers ---

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const KIND_META: Record<NotifKind, { icon: React.ReactNode; color: string; label: string }> = {
  like: { icon: <Heart className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-500', label: 'Like' },
  comment: { icon: <MessageCircle className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-500', label: 'Comment' },
  reply: { icon: <MessageCircle className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-500', label: 'Reply' },
  follow: { icon: <UserPlus className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-500', label: 'Follow' },
  mention: { icon: <AtSign className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-600', label: 'Mention' },
  news_like: { icon: <Heart className="h-3.5 w-3.5" />, color: 'bg-rose-100 text-rose-500', label: 'News like' },
  forge_new: { icon: <Zap className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-500', label: 'New forge' },
  news_comment: { icon: <Newspaper className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-500', label: 'News' },
}

// --- Notification fetcher ---

async function fetchAllNotifications(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Notification[]> {
  const notifications: Notification[] = []

  // Note: For production, consider a single RPC call or a dedicated 'notifications' table 
  // to avoid these multiple round-trips.

  // 1. Forge likes
  {
    const { data: myForges } = await supabase.from('forges').select('id, name').eq('user_id', userId)
    if (myForges?.length) {
      const forgeIds = myForges.map((f: any) => f.id)
      const forgeMap: Record<string, string> = {}
      myForges.forEach((f: any) => { forgeMap[f.id] = f.name })

      const { data: likes } = await supabase
        .from('interactions')
        .select('id, forge_id, user_id, created_at, profiles:user_id(display_name, username, avatar_url)')
        .in('forge_id', forgeIds)
        .eq('interaction_type', 'like')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)

      ;(likes || []).forEach((l: any) => {
        notifications.push({
          id: `like-${l.id}`,
          kind: 'like',
          read: false,
          created_at: l.created_at,
          actor: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles,
          body: `liked your forge "${forgeMap[l.forge_id] || 'a forge'}"`,
          href: `/spark/${l.forge_id}`,
        })
      })
    }
  }

  // 2. Forge comments
  {
    const { data: myForges } = await supabase.from('forges').select('id, name').eq('user_id', userId)
    if (myForges?.length) {
      const forgeIds = myForges.map((f: any) => f.id)
      const forgeMap: Record<string, string> = {}
      myForges.forEach((f: any) => { forgeMap[f.id] = f.name })

      const { data: comments } = await supabase
        .from('forge_comments')
        .select('id, forge_id, user_id, content, created_at, parent_id, profiles:user_id(display_name, username, avatar_url)')
        .in('forge_id', forgeIds)
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)

      ;(comments || []).forEach((c: any) => {
        const isReply = !!c.parent_id
        notifications.push({
          id: `fcomment-${c.id}`,
          kind: isReply ? 'reply' : 'comment',
          read: false,
          created_at: c.created_at,
          actor: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
          body: isReply
            ? `replied to a comment on "${forgeMap[c.forge_id] || 'your forge'}"`
            : `commented on "${forgeMap[c.forge_id] || 'your forge'}"`,
          href: `/spark/${c.forge_id}`,
        })
      })
    }
  }

  // 3. New followers
  {
    const { data: followers } = await supabase
      .from('allies')
      .select('follower_id, created_at, profiles:follower_id(display_name, username, avatar_url)')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    ;(followers || []).forEach((f: any) => {
      notifications.push({
        id: `follow-${f.follower_id}`,
        kind: 'follow',
        read: false,
        created_at: f.created_at,
        actor: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles,
        body: 'started following you',
        href: `/profile/${(Array.isArray(f.profiles) ? f.profiles[0] : f.profiles)?.username || ''}`,
      })
    })
  }

  const seen = new Set<string>()
  return notifications
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// --- UI Components ---

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const meta = KIND_META[notif.kind]
  return (
    <Link href={notif.href} onClick={() => onRead(notif.id)}>
      <div className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer ${!notif.read ? 'bg-orange-50/40' : ''}`}>
        <div className="relative flex-shrink-0">
          {notif.actor?.avatar_url ? (
            <div className="w-9 h-9 rounded-full overflow-hidden relative">
              <Image src={notif.actor.avatar_url} alt={notif.actor.display_name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-orange-500 to-purple-600">
              {notif.actor?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${meta.color} ring-2 ring-white`}>
            {meta.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-800 leading-relaxed">
            <span className="font-bold">{notif.actor?.display_name || 'Someone'}</span> {notif.body}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(notif.created_at)}</p>
        </div>
        {!notif.read && <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />}
      </div>
    </Link>
  )
}

function NotificationCenter({ userId, onClose }: { userId: string; onClose: () => void }) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | NotifKind>('all')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAllNotifications(supabase, userId).then(n => {
      setNotifications(n)
      setLoading(false)
    })
  }, [userId, supabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.kind === filter)

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 flex flex-col" style={{ maxHeight: 'min(520px, 85vh)' }}>
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-black text-sm text-gray-900">Notifications</h2>
          {unreadCount > 0 && <p className="text-[10px] text-orange-500 font-semibold mt-0.5">{unreadCount} unread</p>}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[11px] font-semibold text-gray-500 hover:text-orange-500 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            <p className="text-xs text-gray-400">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">No notifications yet</div>
        ) : (
          filtered.map(n => <NotifItem key={n.id} notif={n} onRead={markRead} />)
        )}
      </div>
    </div>
  )
}

// --- Main Header ---

export default function DashboardHeader({
  activeTab,
  onTabChange,
  userId,
}: {
  activeTab: 'forYou' | 'following'
  onTabChange: (tab: 'forYou' | 'following') => void
  userId?: string
}) {
  const supabase = createClient()
  const [showNotifs, setShowNotifs] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (!userId) return
    const loadCount = async () => {
      try {
        const notifs = await fetchAllNotifications(supabase, userId)
        setUnreadCount(notifs.filter(n => !n.read).length)
      } catch {}
    }
    loadCount()
    const interval = setInterval(loadCount, 90_000)
    return () => clearInterval(interval)
  }, [userId, supabase])

  return (
    <div className={`sticky top-0 z-40 transition-shadow duration-200 ${scrolled ? 'shadow-lg shadow-black/5' : ''}`}>
      <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" />
      <div className="bg-white/96 backdrop-blur-xl border-b border-gray-200/80">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex-shrink-0">
              <Image src="/logo.png" alt="Logo" width={110} height={32} className="h-8 w-auto object-contain" priority />
            </Link>

            <div className="hidden md:flex flex-1 max-w-xs">
              <Link href="/search" className="w-full">
                <div className="flex items-center gap-2 w-full h-9 px-4 rounded-full bg-gray-100 hover:bg-gray-200 transition cursor-pointer">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">Search...</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/search" className="md:hidden">
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Search className="h-5 w-5" /></button>
              </Link>

              <div ref={bellRef} className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)} className={`relative w-9 h-9 flex items-center justify-center rounded-full transition ${showNotifs ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100 text-gray-600'}`}>
                  <Bell className={`h-5 w-5 ${unreadCount > 0 && !showNotifs ? 'animate-[wiggle_2s_ease-in-out_infinite]' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && userId && <NotificationCenter userId={userId} onClose={() => { setShowNotifs(false); setUnreadCount(0); }} />}
              </div>

              <Link href="/dashboard/forges/create">
                <button className="flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-black bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90 transition shadow-md shadow-orange-200/50">
                  <Plus className="h-3.5 w-3.5" /> <span>Create</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 -mb-px">
            {(['forYou', 'following'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`relative px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {tab === 'forYou' ? 'For You' : 'Following'}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-gradient-to-r from-orange-500 to-purple-600" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wiggle {
          0%, 90%, 100% { transform: rotate(0deg); }
          92% { transform: rotate(-12deg); }
          96% { transform: rotate(12deg); }
          98% { transform: rotate(-6deg); }
        }
      `}</style>
    </div>
  )
}