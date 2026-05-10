'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, TrendingUp, Zap, Plus
} from 'lucide-react'
import Link from 'next/link'
import ThreeCurveFab from '@/components/dashboard/layout/three-curve-fab'
import StoryViewer from '@/components/dashboard/stories/story-viewer'
import type { ForgeFeed, NewsArticle } from '@/lib/dashboard/types'
import { TRENDING } from '@/lib/dashboard/constants'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import StoriesStrip from '@/components/dashboard/layout/stories-strip'
import Sidebar from '@/components/dashboard/layout/sidebar'
import EmptyFeed from '@/components/dashboard/layout/empty-feed'
import NewsCard from '@/components/dashboard/cards/news-card'
import ForgeCard from '@/components/dashboard/cards/forge-card'
import CardSkeleton from '@/components/dashboard/cards/card-skeleton'
import CommentPanel from '@/components/dashboard/comments/comment-panel'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [feedItems, setFeedItems] = useState<ForgeFeed[]>([])
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([])
  const [suggestedUsers, setSuggested] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [followedProfiles, setFollowedProfiles] = useState<any[]>([]) // NEW: profiles of allies
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [likedForges, setLikedForges] = useState<Set<string>>(new Set())
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set())
  const [newsCC, setNewsCC] = useState<Record<string, number>>({})
  const [forgeCC, setForgeCC] = useState<Record<string, number>>({})
  const [shareCopied, setShareCopied] = useState<string | null>(null)
  const [showAllNews, setShowAllNews] = useState(false)
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou')
  const [commentPanel, setCommentPanel] = useState<{ articleId?: string; forgeId?: string } | null>(null)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadNews = useCallback(async (currentUser: any) => {
    setNewsLoading(true)
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description || '',
        url: a.url,
        urlToImage: a.urlToImage || null,
        source: a.source || { name: 'News' },
        publishedAt: a.publishedAt,
      }))
      setNewsItems(articles)

      if (currentUser && articles.length) {
        const ids = articles.map(a => a.id)
        const [{ data: likes }, { data: cmts }] = await Promise.all([
          supabase.from('news_likes').select('article_id').eq('user_id', currentUser.id).in('article_id', ids),
          supabase.from('news_comments').select('article_id').in('article_id', ids),
        ])
        setLikedNews(new Set((likes || []).map((l: any) => l.article_id)))
        const cc: Record<string, number> = {}
        ;(cmts || []).forEach((c: any) => { cc[c.article_id] = (cc[c.article_id] || 0) + 1 })
        setNewsCC(cc)
      }
    } catch (e) {
      console.error('[News Error]', e)
    } finally {
      setNewsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: au } } = await supabase.auth.getUser()
        if (!au) { router.push('/auth/login'); return }
        setUser(au)

        // Load own profile
        const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', au.id).single()
        if (myProfile) setCurrentUserProfile(myProfile)

        // Load following (allies) IDs
        const { data: alliesData } = await supabase.from('allies').select('following_id').eq('follower_id', au.id)
        const followSet = new Set<string>((alliesData || []).map((a: any) => a.following_id))
        setFollowing(followSet)

        // ---- NEW: Fetch profiles of followed users (allies) ----
        const followingIds = Array.from(followSet)
        if (followingIds.length > 0) {
          const { data: fp } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url')
            .in('id', followingIds)
          setFollowedProfiles(fp || [])
        } else {
          setFollowedProfiles([])
        }

        // Load forges (published)
        const sel = `id,name,description,template_type,user_id,created_at,is_published,profiles:user_id(id,display_name,username,avatar_url)`
        const { data: forges } = await supabase.from('forges').select(sel).eq('is_published', true).order('created_at', { ascending: false }).limit(30)
        setFeedItems(forges || [])

        if (forges?.length) {
          const { data: fc } = await supabase.from('forge_comments').select('forge_id').in('forge_id', forges.map(f => f.id))
          const cc: Record<string, number> = {}
          ;(fc || []).forEach((c: any) => { cc[c.forge_id] = (cc[c.forge_id] || 0) + 1 })
          setForgeCC(cc)
        }

        // Load suggested users (not followed, not current)
        const { data: users } = await supabase.from('profiles').select('id,display_name,username,avatar_url').neq('id', au.id).limit(12)
        setSuggested((users || []).filter((u: any) => !followSet.has(u.id)))

        // Load liked forges
        const { data: liked } = await supabase.from('interactions').select('forge_id').eq('user_id', au.id).eq('interaction_type', 'like')
        setLikedForges(new Set((liked || []).map((i: any) => i.forge_id)))

        setLoading(false)
        loadNews(au)
      } catch (e) {
        setLoading(false)
      }
    }
    load()
  }, [router, supabase, loadNews])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFollow = async (userId: string) => {
    const prev = following.has(userId)
    setFollowing(s => { const n = new Set(s); prev ? n.delete(userId) : n.add(userId); return n })
    await fetch('/api/allies', {
      method: prev ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: userId }),
    })
  }

  const handleForgeLike = async (id: string) => {
    if (!user) return
    const prev = likedForges.has(id)
    setLikedForges(s => { const n = new Set(s); prev ? n.delete(id) : n.add(id); return n })
    if (prev) await supabase.from('interactions').delete().eq('forge_id', id).eq('user_id', user.id).eq('interaction_type', 'like')
    else await supabase.from('interactions').insert({ forge_id: id, user_id: user.id, interaction_type: 'like' })
  }

  const handleNewsLike = async (id: string) => {
    if (!user) return
    const prev = likedNews.has(id)
    setLikedNews(s => { const n = new Set(s); prev ? n.delete(id) : n.add(id); return n })
    if (prev) await supabase.from('news_likes').delete().eq('article_id', id).eq('user_id', user.id)
    else await supabase.from('news_likes').insert({ article_id: id, user_id: user.id })
  }

  const handleShare = (url: string, id: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setShareCopied(id)
    setTimeout(() => setShareCopied(null), 2000)
  }

  // ── Derived View Logic ─────────────────────────────────────────────────────
  const visibleNews = showAllNews ? newsItems : newsItems.slice(0, 4)
  const followingForges = feedItems.filter(f => following.has(f.user_id))

  // ---- NEW: Correctly combine users for stories strip ----
  const usersWithSelf: any[] = []
  const seen = new Set<string>()

  if (currentUserProfile) {
    usersWithSelf.push(currentUserProfile)
    seen.add(currentUserProfile.id)
  }

  followedProfiles.forEach(p => {
    if (!seen.has(p.id)) {
      usersWithSelf.push(p)
      seen.add(p.id)
    }
  })

  suggestedUsers.forEach(u => {
    if (!seen.has(u.id)) {
      usersWithSelf.push(u)
      seen.add(u.id)
    }
  })

  // ── Loading Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-6">
           <Skeleton className="h-48 w-full rounded-3xl" />
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <DashboardHeader activeTab={activeTab} onTabChange={setActiveTab} />
      
      <StoriesStrip
        users={usersWithSelf}           
        currentUserId={user?.id || null}
        onOpenStory={setViewingStoryUserId}
      />

      <main className="max-w-2xl lg:max-w-5xl mx-auto px-3 xs:px-4 py-4 grid lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-8">
          
          {/* ── TAB 1: FOR YOU (NEWS ONLY) ─────────────────────────────────── */}
          {activeTab === 'forYou' && (
            <>
              {/* Trending Tags Section */}
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Trending Now</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {TRENDING.map(tag => (
                    <button key={tag} className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full bg-white border border-gray-100 text-gray-600 shadow-sm whitespace-nowrap active:bg-orange-50 transition">
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* News Feed Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Top Stories</h2>
                  </div>
                  <button onClick={() => setShowAllNews(!showAllNews)} className="text-xs font-bold text-orange-500">
                    {showAllNews ? 'Show Less' : 'See All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleNews.map(a => (
                    <div key={a?.id || Math.random()} className="flex justify-center">
                      <NewsCard
                        article={a}
                        isLiked={likedNews.has(a.id)}
                        commentCount={newsCC[a.id] || 0}
                        shareCopied={shareCopied === a.id}
                        onLike={() => handleNewsLike(a.id)}
                        onComment={() => setCommentPanel({ articleId: a.id })}
                        onShare={() => handleShare(a.url, a.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── TAB 2: FOLLOWING (CREATOR FORGES ONLY) ────────────────────── */}
          {activeTab === 'following' && (
            <section className="max-w-md mx-auto lg:max-w-none">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-purple-500" />
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Following Feed</h2>
              </div>
              
              {followingForges.length === 0 ? (
                <EmptyFeed />
              ) : (
                <div className="space-y-6">
                  {followingForges.map(forge => (
                    <ForgeCard
                      key={forge.id}
                      forge={forge}
                      isFollowing={true}
                      isLiked={likedForges.has(forge.id)}
                      currentUserId={user?.id || ''}
                      commentCount={forgeCC[forge.id] || 0}
                      onFollow={() => handleFollow(forge.user_id)}
                      onLike={() => handleForgeLike(forge.id)}
                      onComment={() => setCommentPanel({ forgeId: forge.id })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar remains to help users find more creators */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Sidebar
              suggestedUsers={suggestedUsers}
              followingSet={following}
              onFollow={handleFollow}
            />
          </div>
        </aside>
      </main>

      {/* FAB: Create Button */}

        <ThreeCurveFab />

      {commentPanel && (
        <CommentPanel
          articleId={commentPanel.articleId}
          forgeId={commentPanel.forgeId}
          currentUser={user}
          onClose={() => setCommentPanel(null)}
        />
      )}

      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}
    </div>
  )
}