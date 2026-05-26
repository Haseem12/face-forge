'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, TrendingUp, Zap, Plus, RefreshCw, Bell, Sparkles, Users, Home, Compass, Clock,
  Film, Heart, Briefcase, Gamepad2, Trophy, Globe, Code, Palette
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
import FeedCard from '@/components/dashboard/cards/feed-card'
import CardSkeleton from '@/components/dashboard/cards/card-skeleton'
import CommentPanel from '@/components/dashboard/comments/comment-panel'
import ArticleReader from '@/components/dashboard/news/ArticleReader'

// News categories
const NEWS_CATEGORIES = [
  { id: 'all', name: 'For You', icon: Sparkles, color: 'text-purple-500' },
  { id: 'technology', name: 'Tech', icon: Code, color: 'text-blue-500' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, color: 'text-pink-500' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Heart, color: 'text-red-500' },
  { id: 'business', name: 'Business', icon: Briefcase, color: 'text-green-500' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: 'text-indigo-500' },
  { id: 'sports', name: 'Sports', icon: Trophy, color: 'text-yellow-500' },
  { id: 'world', name: 'World', icon: Globe, color: 'text-cyan-500' },
  { id: 'creators', name: 'Creator Hub', icon: Palette, color: 'text-orange-500' },
]

// Helper for time ago
function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return past.toLocaleDateString()
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────
  const [feedItems, setFeedItems] = useState<ForgeFeed[]>([])
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([])
  const [followingFeedPosts, setFollowingFeedPosts] = useState<any[]>([])
  const [suggestedUsers, setSuggested] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [followedProfiles, setFollowedProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [followingFeedLoading, setFollowingFeedLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [likedForges, setLikedForges] = useState<Set<string>>(new Set())
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set())
  const [likedFollowingFeed, setLikedFollowingFeed] = useState<Set<string>>(new Set())
  const [newsCC, setNewsCC] = useState<Record<string, number>>({})
  const [forgeCC, setForgeCC] = useState<Record<string, number>>({})
  const [followingFeedCC, setFollowingFeedCC] = useState<Record<string, number>>({})
  const [shareCopied, setShareCopied] = useState<string | null>(null)
  const [showAllNews, setShowAllNews] = useState(false)
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou')
  const [commentPanel, setCommentPanel] = useState<{ articleId?: string; forgeId?: string; feedId?: string } | null>(null)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // ── State for Auto-Refresh & Infinite Scroll ───────────────────────────
  const [displayedNews, setDisplayedNews] = useState<NewsArticle[]>([])
  const [newsPage, setNewsPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showRefreshToast, setShowRefreshToast] = useState(false)
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [newArticlesCount, setNewArticlesCount] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)
  const newsContainerRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  // ✅ FIX: Use ref for subscription instead of state
  const subscriptionRef = useRef<any>(null)

  // ── Load News with Category Support ──────────────────────────────────────────
  const loadNews = useCallback(async (pageNum: number, category: string = 'all', isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else if (pageNum === 1) {
      setNewsLoading(true)
    }
    
    try {
      const bustParam = isRefresh ? `&bust=${Date.now()}` : ''
      const res = await fetch(`/api/news?page=${pageNum}&limit=${ITEMS_PER_PAGE}&category=${category}${bustParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      const articles: NewsArticle[] = (data.articles || []).map((a: any, index: number) => ({
        id: a.id || `${Date.now()}_${index}_${Math.random()}`,
        title: a.title,
        description: a.description || '',
        url: a.url,
        urlToImage: a.urlToImage || null,
        source: a.source || { name: a.category || category },
        publishedAt: a.publishedAt || new Date().toISOString(),
        category: a.category || category,
        isNew: isRefresh && index < 3
      }))
      
      if (isRefresh || pageNum === 1) {
        // Count new articles from last hour
        const now = new Date()
        const newCount = articles.filter(a => {
          const pubDate = new Date(a.publishedAt)
          const diffMinutes = (now.getTime() - pubDate.getTime()) / 1000 / 60
          return diffMinutes < 60
        }).length
        
        setNewArticlesCount(newCount)
        setNewsItems(articles)
        setDisplayedNews(articles.slice(0, ITEMS_PER_PAGE))
        setNewsPage(1)
        setHasMoreNews(articles.length >= ITEMS_PER_PAGE)
        setLastUpdated(new Date())
        setShowRefreshButton(false)
        
        if (user) {
          const ids = articles.slice(0, ITEMS_PER_PAGE).map(a => a.id)
          if (ids.length) {
            const [{ data: likes }, { data: cmts }] = await Promise.all([
              supabase.from('news_likes').select('article_id').eq('user_id', user.id).in('article_id', ids),
              supabase.from('news_comments').select('article_id').in('article_id', ids),
            ])
            setLikedNews(new Set((likes || []).map((l: any) => l.article_id)))
            const cc: Record<string, number> = {}
            ;(cmts || []).forEach((c: any) => { cc[c.article_id] = (cc[c.article_id] || 0) + 1 })
            setNewsCC(cc)
          }
        }
      } else {
        // Append for infinite scroll
        const newArticles = articles.filter(a => !newsItems.some(n => n.id === a.id))
        setNewsItems(prev => [...prev, ...newArticles])
        setDisplayedNews(prev => [...prev, ...newArticles])
        setHasMoreNews(articles.length >= ITEMS_PER_PAGE)
      }
    } catch (e) {
      console.error('[News Error]', e)
    } finally {
      setNewsLoading(false)
      setRefreshing(false)
    }
  }, [supabase, user, newsItems])

  // ── Background Real-time Check ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    
    const checkForNewNews = async () => {
      if (document.hidden) return
      
      try {
        const since = lastUpdated ? lastUpdated.toISOString() : new Date(Date.now() - 60000).toISOString()
        const res = await fetch(`/api/news?since=${since}&category=${selectedCategory}`)
        const data = await res.json()
        
        const newArticles = (data.articles || []).filter((a: any) => {
          const pubDate = new Date(a.publishedAt)
          return pubDate > (lastUpdated || new Date(Date.now() - 60000))
        })
        
        if (newArticles.length > 0 && !showRefreshButton) {
          setNewArticlesCount(prev => prev + newArticles.length)
          setShowRefreshButton(true)
        }
      } catch (error) {
        console.error('Background check failed:', error)
      }
    }
    
    const interval = setInterval(checkForNewNews, 30000)
    return () => clearInterval(interval)
  }, [user, lastUpdated, showRefreshButton, selectedCategory])

  // ── Handle Manual Refresh ──────────────────────────────────────────────
  const handleRefresh = async () => {
    if (refreshing) return
    await loadNews(1, selectedCategory, true)
    
    if (newsContainerRef.current) {
      newsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    
    setShowRefreshToast(true)
    setTimeout(() => setShowRefreshToast(false), 2000)
  }

  // ── Handle Category Change ──────────────────────────────────────────────
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setShowAllNews(false)
    loadNews(1, categoryId, true)
  }

  // ── Infinite Scroll Observer ──────────────────────────────────────────
  useEffect(() => {
    if (showAllNews) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMoreNews && !newsLoading && !refreshing) {
          const nextPage = newsPage + 1
          setNewsPage(nextPage)
          await loadNews(nextPage, selectedCategory, false)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMoreNews, newsLoading, refreshing, newsPage, loadNews, showAllNews, selectedCategory])

  // ── Load Following Feed Posts ──────────────────────────────────────────
  const loadFollowingFeedPosts = useCallback(async () => {
    if (!user) return
    setFollowingFeedLoading(true)
    try {
      const followingIds = Array.from(following)
      const allUserIds = [...followingIds, user.id]
      
      if (allUserIds.length === 0) {
        setFollowingFeedPosts([])
        setFollowingFeedLoading(false)
        return
      }
      
      const { data: posts, error } = await supabase
        .from('user_feeds')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      const postsWithProfiles = (posts || []).map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }))
      
      setFollowingFeedPosts(postsWithProfiles)
      
      if (user && postsWithProfiles.length) {
        const postIds = postsWithProfiles.map(p => p.id)
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
        
        setLikedFollowingFeed(new Set(likes?.map(l => l.post_id) || []))
        
        const { data: comments } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds)
        
        const cc: Record<string, number> = {}
        comments?.forEach((c: any) => { cc[c.post_id] = (cc[c.post_id] || 0) + 1 })
        setFollowingFeedCC(cc)
      }
      
    } catch (error) {
      console.error('Error loading following feed posts:', error)
    } finally {
      setFollowingFeedLoading(false)
    }
  }, [supabase, user, following])

  // ── Reload following feed when following changes ──────────────────────────
  useEffect(() => {
    if (user) {
      loadFollowingFeedPosts()
    }
  }, [following, user, loadFollowingFeedPosts])

  // ✅ FIXED: REAL-TIME SUBSCRIPTION
  useEffect(() => {
    if (!user) return

    const followingIds = Array.from(following)
    const allUserIds = [...followingIds, user.id]
    
    if (allUserIds.length === 0) return

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const subscription = supabase
      .channel('user_feeds_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_feeds',
          filter: `user_id=in.(${allUserIds.join(',')})`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single()
          
          const newPost = {
            ...payload.new,
            profiles: profile
          }
          
          setFollowingFeedPosts(prev => [newPost, ...prev])
          setShowRefreshToast(true)
          setTimeout(() => setShowRefreshToast(false), 2000)
        }
      )
      .subscribe()

    subscriptionRef.current = subscription

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [user, following, supabase])

  // ── Listen for manual post created events ──
  useEffect(() => {
    const handlePostCreated = (event: any) => {
      loadFollowingFeedPosts()
    }
    
    window.addEventListener('postCreated', handlePostCreated)
    return () => window.removeEventListener('postCreated', handlePostCreated)
  }, [loadFollowingFeedPosts])

  // ── Main useEffect for user data loading ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: au } } = await supabase.auth.getUser()
        if (!au) { router.push('/auth/login'); return }
        setUser(au)

        const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', au.id).single()
        if (myProfile) setCurrentUserProfile(myProfile)

        const { data: alliesData } = await supabase.from('allies').select('following_id').eq('follower_id', au.id)
        const followSet = new Set<string>((alliesData || []).map((a: any) => a.following_id))
        setFollowing(followSet)

        const followingIds = Array.from(followSet)
        if (followingIds.length > 0) {
          const { data: fp } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url')
            .in('id', followingIds)
          setFollowedProfiles(fp || [])
        }

        const sel = `id,name,description,template_type,user_id,created_at,is_published,profiles:user_id(id,display_name,username,avatar_url)`
        const { data: forges } = await supabase.from('forges').select(sel).eq('is_published', true).order('created_at', { ascending: false }).limit(30)
        setFeedItems(forges || [])

        if (forges?.length) {
          const { data: fc } = await supabase.from('forge_comments').select('forge_id').in('forge_id', forges.map(f => f.id))
          const cc: Record<string, number> = {}
          ;(fc || []).forEach((c: any) => { cc[c.forge_id] = (cc[c.forge_id] || 0) + 1 })
          setForgeCC(cc)
        }

        const { data: users } = await supabase.from('profiles').select('id,display_name,username,avatar_url').neq('id', au.id).limit(12)
        setSuggested((users || []).filter((u: any) => !followSet.has(u.id)))

        const { data: liked } = await supabase.from('interactions').select('forge_id').eq('user_id', au.id).eq('interaction_type', 'like')
        setLikedForges(new Set((liked || []).map((i: any) => i.forge_id)))

        await loadNews(1, 'all', true)
        
        setLoading(false)
      } catch (e) {
        console.error('Load error:', e)
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

  const handleFollowingFeedLike = async (postId: string) => {
    if (!user) return
    const isLiked = likedFollowingFeed.has(postId)
    
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setLikedFollowingFeed(prev => { const n = new Set(prev); n.delete(postId); return n })
      setFollowingFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) - 1 } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      setLikedFollowingFeed(prev => new Set(prev).add(postId))
      setFollowingFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    }
  }

  const handleShare = (url: string, id: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setShareCopied(id)
    setTimeout(() => setShareCopied(null), 2000)
  }

  const handleTagClick = (tag: string) => {
    console.log('Searching for tag:', tag)
  }

  const handleReadInside = (article: NewsArticle, index: number) => {
    setCurrentArticleIndex(index)
    setSelectedArticle(article)
  }

  const handleNextArticle = () => {
    const currentList = showAllNews ? newsItems : displayedNews
    if (currentArticleIndex < currentList.length - 1) {
      const nextIndex = currentArticleIndex + 1
      setCurrentArticleIndex(nextIndex)
      setSelectedArticle(currentList[nextIndex])
    }
  }

  const handlePreviousArticle = () => {
    const currentList = showAllNews ? newsItems : displayedNews
    if (currentArticleIndex > 0) {
      const prevIndex = currentArticleIndex - 1
      setCurrentArticleIndex(prevIndex)
      setSelectedArticle(currentList[prevIndex])
    }
  }

  // ── Derived View Logic ─────────────────────────────────────────────────────
  const currentNewsList = showAllNews ? newsItems : displayedNews

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
              {/* Category Tabs - Horizontal Scroll */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 pb-2 min-w-max">
                  {NEWS_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                      }`}
                    >
                      <category.icon className={`h-4 w-4 ${selectedCategory === category.id ? 'text-white' : category.color}`} />
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending Tags Section */}
              <div className="overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Trending Now</span>
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Live updates
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {TRENDING.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full bg-white border border-gray-100 text-gray-600 shadow-sm whitespace-nowrap active:bg-orange-50 transition"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* News Feed Section */}
              <section ref={newsContainerRef}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                      {NEWS_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Top Stories'}
                    </h2>
                    {lastUpdated && (
                      <span className="text-[10px] text-gray-400 ml-2">
                        Updated {timeAgo(lastUpdated)} ago
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Smart Refresh Button */}
                    {showRefreshButton && (
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse hover:opacity-90 transition disabled:animate-none"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        {newArticlesCount} new {newArticlesCount === 1 ? 'story' : 'stories'}
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setShowAllNews(!showAllNews)} 
                      className="text-xs font-bold text-orange-500 hover:text-orange-600"
                    >
                      {showAllNews ? 'Show Less' : 'See All'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentNewsList.map((article, idx) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      isLiked={likedNews.has(article.id)}
                      commentCount={newsCC[article.id] || 0}
                      shareCopied={shareCopied === article.id}
                      onLike={() => handleNewsLike(article.id)}
                      onComment={() => setCommentPanel({ articleId: article.id })}
                      onShare={() => handleShare(article.url, article.id)}
                      onReadInside={() => handleReadInside(article, idx)}
                      isNew={article.isNew}
                    />
                  ))}
                  
                  {/* Infinite scroll observer */}
                  {!showAllNews && hasMoreNews && !newsLoading && !refreshing && newsItems.length > 0 && (
                    <div ref={observerTarget} className="flex justify-center py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Loading more {NEWS_CATEGORIES.find(c => c.id === selectedCategory)?.name?.toLowerCase()} news...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Initial Loading State */}
                  {newsLoading && displayedNews.length === 0 && (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                          <div className="h-48 bg-gray-200 rounded-xl mb-4" />
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {!newsLoading && displayedNews.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                      <div className="text-6xl mb-4">📭</div>
                      <h3 className="font-bold text-gray-900 mb-1">No news in this category</h3>
                      <p className="text-sm text-gray-500">Try another category or check back later</p>
                      <button
                        onClick={() => handleCategoryChange('all')}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full text-sm font-medium"
                      >
                        View All News
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── TAB 2: FOLLOWING (FEED POSTS FROM FOLLOWED USERS + YOUR POSTS) ── */}
          {activeTab === 'following' && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-purple-500" />
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Following Feed</h2>
              </div>
              
              {followingFeedPosts.length === 0 && !followingFeedLoading ? (
                <EmptyFeed 
                  title="No posts from people you follow"
                  description="When you or people you follow share posts, they'll appear here"
                />
              ) : (
                <div className="space-y-4">
                  {followingFeedPosts.map((post) => (
                    <FeedCard
                      key={post.id}
                      post={post}
                      isFollowing={following.has(post.user_id)}
                      isLiked={likedFollowingFeed.has(post.id)}
                      currentUserId={user?.id || ''}
                      commentCount={followingFeedCC[post.id] || 0}
                      onFollow={() => handleFollow(post.user_id)}
                      onLike={() => handleFollowingFeedLike(post.id)}
                      onComment={() => setCommentPanel({ feedId: post.id })}
                      onShare={() => handleShare(`/post/${post.id}`, post.id)}
                      onTagClick={handleTagClick}
                    />
                  ))}
                  
                  {followingFeedLoading && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
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

      {/* FAB */}
      <ThreeCurveFab />

      {commentPanel && (
        <div className="fixed inset-0 z-[60]">
          <CommentPanel
            articleId={commentPanel.articleId}
            forgeId={commentPanel.forgeId}
            currentUser={user}
            onClose={() => setCommentPanel(null)}
          />
        </div>
      )}

      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onNext={handleNextArticle}
          onPrevious={handlePreviousArticle}
          hasNext={currentArticleIndex < (showAllNews ? newsItems.length : displayedNews.length) - 1}
          hasPrevious={currentArticleIndex > 0}
          isLiked={likedNews.has(selectedArticle.id)}
          commentCount={newsCC[selectedArticle.id] || 0}
          onLike={() => handleNewsLike(selectedArticle.id)}
          onComment={() => setCommentPanel({ articleId: selectedArticle.id })}
        />
      )}

      {/* Refresh Toast Notification */}
      {showRefreshToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg">
            <RefreshCw className="h-4 w-4" />
            New content available!
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
