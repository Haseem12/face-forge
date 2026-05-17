'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import FeedCard, { FeedPost } from './FeedCard'
import { Loader2, Sparkles } from 'lucide-react'

export default function FeedsList({ currentUserId }: { currentUserId: string }) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const supabase = createClient()

  useEffect(() => {
    loadFeeds()
    loadUserInteractions()
  }, [])

  const loadFeeds = async () => {
    try {
      const { data: postsData, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      
      const postsWithProfiles = (postsData || []).map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }))
      
      setPosts(postsWithProfiles)
      
      // Load comment counts
      const postIds = postsWithProfiles.map(p => p.id)
      if (postIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('post_id', { count: 'exact', head: false })
          .in('post_id', postIds)
        
        const counts: Record<string, number> = {}
        commentsData?.forEach(c => {
          counts[c.post_id] = (counts[c.post_id] || 0) + 1
        })
        setCommentCounts(counts)
      }
      
    } catch (error) {
      console.error('Error loading feeds:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserInteractions = async () => {
    if (!currentUserId) return
    
    // Load liked posts
    const { data: likesData } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
    
    setLikedPosts(new Set(likesData?.map(l => l.post_id) || []))
    
    // Load following
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
    
    setFollowing(new Set(followingData?.map(f => f.following_id) || []))
  }

  const handleLike = async (postId: string) => {
    if (!currentUserId) return
    
    const isLiked = likedPosts.has(postId)
    
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
      
      setLikedPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: (p.likes_count || 0) - 1 } : p
      ))
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: currentUserId })
      
      setLikedPosts(prev => new Set(prev).add(postId))
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
      ))
    }
  }

  const handleFollow = async (creatorId: string) => {
    if (!currentUserId || creatorId === currentUserId) return
    
    const isFollowed = following.has(creatorId)
    
    if (isFollowed) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', creatorId)
      
      setFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(creatorId)
        return newSet
      })
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: creatorId })
      
      setFollowing(prev => new Set(prev).add(creatorId))
    }
  }

  const handleTagClick = (tag: string) => {
    // Navigate to search or filter by tag
    console.log('Search for tag:', tag)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 mx-4">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p className="text-gray-500 text-sm">Be the first to share something!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {posts.map((post) => (
        <FeedCard
          key={post.id}
          post={post}
          isFollowing={following.has(post.user_id)}
          isLiked={likedPosts.has(post.id)}
          currentUserId={currentUserId}
          commentCount={commentCounts[post.id] || 0}
          onFollow={() => handleFollow(post.user_id)}
          onLike={() => handleLike(post.id)}
          onComment={() => {}}
          onShare={() => {}}
          onTagClick={handleTagClick}
        />
      ))}
    </div>
  )
}
