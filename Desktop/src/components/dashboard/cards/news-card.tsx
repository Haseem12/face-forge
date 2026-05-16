'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getArticleImage } from '@/lib/dashboard/image-helper'
import {
  Heart, MessageCircle, Share2, Check, ExternalLink, MoreHorizontal, 
  Copy, Download, Eye, X, Loader2, Send, Image as ImageIcon, 
  Video, Smile, MapPin, Trash2, Plus, Code, Music, Gamepad2, 
  Briefcase, HeartHandshake, Lightbulb, Palette, Trophy, Newspaper,
  Flame, ChevronRight, User, Hash, Play, Volume2, VolumeX
} from 'lucide-react'

// ============ Types ============

type PostCategory = 
  | 'tech' | 'news' | 'entertainment' | 'gaming' | 'sports' 
  | 'music' | 'art' | 'business' | 'science' | 'lifestyle'

interface UserPost {
  id: string
  user_id: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  category: PostCategory
  title?: string
  tags?: string[]
}

interface NewsArticle {
  id: string
  title: string
  caption?: string
  media_url?: string
  urlToImage?: string
  source?: { name: string }
  url?: string
  publishedAt?: string
  created_at?: string
  type: 'news'
}

type FeedItem = (UserPost & { type: 'user' }) | (NewsArticle & { type: 'news' })

// ============ Category Config ============

const CATEGORIES = [
  { value: 'tech', label: 'Technology', icon: Code, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { value: 'news', label: 'News', icon: Newspaper, color: 'text-red-600', bgColor: 'bg-red-50' },
  { value: 'entertainment', label: 'Entertainment', icon: HeartHandshake, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'text-green-600', bgColor: 'bg-green-50' },
  { value: 'sports', label: 'Sports', icon: Trophy, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { value: 'music', label: 'Music', icon: Music, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { value: 'art', label: 'Art', icon: Palette, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { value: 'business', label: 'Business', icon: Briefcase, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { value: 'science', label: 'Science', icon: Lightbulb, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { value: 'lifestyle', label: 'Lifestyle', icon: HeartHandshake, color: 'text-rose-600', bgColor: 'bg-rose-50' },
]

// ============ News Article Card (Your old working version) ============

function NewsArticleCard({
  article,
  isLiked,
  commentCount,
  shareCopied,
  onLike,
  onComment,
  onShare,
  onReadInside,
}: {
  article: NewsArticle
  isLiked: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onReadInside: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = article.caption || article.title || "Untitled"
  const sourceName = article.source?.name || "News Source"
  const originalImage = article.media_url || article.urlToImage

  useEffect(() => {
    const loadImage = async () => {
      setImageLoading(true)
      const url = await getArticleImage(title, originalImage)
      setImageUrl(url)
      setImageLoading(false)
    }
    loadImage()
  }, [title, originalImage])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowImageMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyImage = async () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2000)
        setShowImageMenu(false)
      } catch (error) {
        console.error('Failed to copy image:', error)
      }
    }
  }

  const handleDownloadImage = () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `news-${Date.now()}.jpg`
      link.click()
      setShowImageMenu(false)
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md w-full group">
      <div className="relative w-full h-48 xs:h-52 sm:h-56 bg-gray-50">
        {imageLoading ? (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        ) : imageUrl ? (
          imageUrl.startsWith('data:') ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover cursor-pointer" onClick={onReadInside} />
          ) : (
            <Image src={imageUrl} alt={title} fill className="object-cover cursor-pointer" sizes="100vw" unoptimized onClick={onReadInside} />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer" onClick={onReadInside}>
            <div className="text-center">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-gray-500 text-sm">News image</p>
            </div>
          </div>
        )}
        
        {imageUrl && !imageLoading && (
          <div className="absolute top-3 right-3" ref={menuRef}>
            <button onClick={() => setShowImageMenu(!showImageMenu)} className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
              <MoreHorizontal className="h-4 w-4 text-white" />
            </button>
            {showImageMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                <button onClick={handleCopyImage} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  {copiedImage ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedImage ? 'Copied!' : 'Copy image'}
                </button>
                <button onClick={handleDownloadImage} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Save image
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-black text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full uppercase tracking-wider">
            {sourceName}
          </span>
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={onReadInside} className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transform scale-95 group-hover:scale-100 transition">
            <Eye className="h-4 w-4" />
            Read in app
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <button onClick={onReadInside} className="w-full text-left">
            <h3 className="text-[15px] xs:text-base font-bold text-gray-900 leading-tight line-clamp-2 mb-2 hover:text-orange-600 transition">
              {title}
            </h3>
          </button>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
            <span>{timeAgo(article.publishedAt || article.created_at)} ago</span>
            {article.url && (
              <>
                <span>•</span>
                <button onClick={onReadInside} className="text-orange-500 font-bold flex items-center gap-0.5 hover:underline">
                  Read <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.preventDefault(); onLike(); }} className={`flex items-center gap-1.5 transition ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="text-[12px] font-bold">Like</span>
            </button>
            <button onClick={(e) => { e.preventDefault(); onComment(); }} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition">
              <MessageCircle className="h-4 w-4" />
              <span className="text-[12px] font-bold">{commentCount > 0 ? commentCount : 'Comment'}</span>
            </button>
            <button onClick={(e) => { e.preventDefault(); onShare(); }} className={`flex items-center gap-1.5 transition ${shareCopied ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}>
              {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="text-[12px] font-bold">Share</span>
            </button>
          </div>
          <button onClick={onReadInside} className="text-orange-500 hover:text-orange-600 text-xs font-bold flex items-center gap-1">
            Read <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  )
}

// ============ User Post Card ============

function UserPostCard({
  post,
  author,
  currentUserId,
  isLiked,
  onLike,
  onComment,
  onShare,
  onDelete,
}: {
  post: UserPost & { type: 'user' }
  author: any
  currentUserId: string
  isLiked: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOwner = currentUserId === post.user_id
  const categoryData = CATEGORIES.find(c => c.value === post.category)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
      {categoryData && (
        <div className="flex items-center gap-2 mb-2">
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryData.bgColor} ${categoryData.color}`}>
            <categoryData.icon className="h-3 w-3" />
            {categoryData.label}
          </div>
          {post.title && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
            </>
          )}
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <Link href={`/profile/${author?.username || 'user'}`} className="flex gap-3 flex-1">
          {author?.avatar_url ? (
            <Image src={author.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {author?.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{author?.display_name || 'User'}</p>
            <p className="text-xs text-gray-500">@{author?.username || 'user'} · {timeAgo(post.created_at)}</p>
          </div>
        </Link>
        
        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10">
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-2 ml-13">
        <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.content}</p>
        
        {post.media_url && (
          <div className="mt-3 rounded-xl overflow-hidden bg-gray-100">
            {post.media_type === 'image' ? (
              <img src={post.media_url} alt="" className="w-full max-h-96 object-contain" />
            ) : (
              <video src={post.media_url} className="w-full max-h-96 object-contain" controls />
            )}
          </div>
        )}
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-orange-500">#{tag}</span>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-4 mt-3 pt-2 text-xs text-gray-500">
          <span>{post.likes_count || 0} likes</span>
          <span>{post.comments_count || 0} comments</span>
          <span>{post.shares_count || 0} shares</span>
        </div>
        
        <div className="flex items-center justify-around mt-2 pt-2 border-t border-gray-100">
          <button onClick={onLike} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm transition ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}>
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
            Like
          </button>
          <button onClick={onComment} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition">
            <MessageCircle className="h-4 w-4" />
            Comment
          </button>
          <button onClick={onShare} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-gray-500 hover:text-green-500 hover:bg-green-50 transition">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ Create Post Modal/Component ============

function CreatePostForm({ userId, onPostCreated }: { userId: string; onPostCreated: () => void }) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PostCategory>('news')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      alert('Please select an image or video file')
      return
    }
    setMediaFile(file)
    setMediaType(isImage ? 'image' : 'video')
    setMediaPreview(URL.createObjectURL(file))
  }

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile) return null
    const fileExt = mediaFile.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = `posts/${fileName}`
    const { error } = await supabase.storage.from('post-media').upload(filePath, mediaFile)
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filePath)
    return publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return
    setIsUploading(true)
    try {
      const mediaUrl = mediaFile ? await uploadMedia() : null
      const { error } = await supabase.from('user_posts').insert({
        user_id: userId,
        content: content.trim(),
        title: title.trim() || null,
        category,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      setContent('')
      setTitle('')
      setMediaFile(null)
      if (mediaPreview) URL.revokeObjectURL(mediaPreview)
      setMediaPreview(null)
      setMediaType(null)
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setIsUploading(false)
    }
  }

  const selectedCategoryData = CATEGORIES.find(c => c.value === category)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-500" />
        <div className="flex-1">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title (optional)" className="w-full mb-2 text-base font-semibold border-0 focus:ring-0 placeholder:text-gray-300 outline-none" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind? Share your thoughts, forges, or news..." className="w-full resize-none border-0 focus:ring-0 text-gray-700 placeholder:text-gray-400 text-sm outline-none min-h-[60px]" rows={2} />
          
          <div className="relative mt-2">
            <button onClick={() => setShowCategoryPicker(!showCategoryPicker)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${selectedCategoryData?.bgColor} ${selectedCategoryData?.color}`}>
              {selectedCategoryData && <selectedCategoryData.icon className="h-3 w-3" />}
              {selectedCategoryData?.label}
              <ChevronRight className={`h-3 w-3 transition-transform ${showCategoryPicker ? 'rotate-90' : ''}`} />
            </button>
            {showCategoryPicker && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 p-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => { setCategory(cat.value); setShowCategoryPicker(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cat.color} hover:${cat.bgColor} transition`}>
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100">
              {mediaType === 'image' ? <img src={mediaPreview} alt="Preview" className="max-h-64 w-auto mx-auto object-contain" /> : <video src={mediaPreview} className="max-h-64 w-auto mx-auto" controls />}
              <button onClick={() => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaFile(null); setMediaPreview(null); setMediaType(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"><X className="h-4 w-4" /></button>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"><ImageIcon className="h-5 w-5" /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"><Video className="h-5 w-5" /></button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
            </div>
            <button onClick={handleSubmit} disabled={(!content.trim() && !mediaFile) || isUploading} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Main Hybrid Feed ============

export default function HybridFeed({ userId, newsArticles = [] }: { userId: string; newsArticles?: NewsArticle[] }) {
  const [userPosts, setUserPosts] = useState<(UserPost & { type: 'user' })[]>([])
  const [authors, setAuthors] = useState<Map<string, any>>(new Map())
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadUserPosts = useCallback(async () => {
    try {
      const { data: postsData } = await supabase
        .from('user_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      const postsWithType = (postsData || []).map(p => ({ ...p, type: 'user' as const }))
      setUserPosts(postsWithType)
      
      const userIds = [...new Set(postsWithType.map(p => p.user_id))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        const authorMap = new Map()
        profilesData?.forEach(profile => authorMap.set(profile.id, profile))
        setAuthors(authorMap)
      }
      
      if (userId) {
        const { data: likesData } = await supabase.from('post_likes').select('post_id').eq('user_id', userId)
        setLikedPosts(new Set(likesData?.map(l => l.post_id) || []))
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    loadUserPosts()
  }, [loadUserPosts])

  const handleLike = async (postId: string) => {
    if (!userId) return
    const isLiked = likedPosts.has(postId)
    
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      setLikedPosts(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; })
      setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) - 1 } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
      setLikedPosts(prev => new Set(prev).add(postId))
      setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    const { error } = await supabase.from('user_posts').delete().eq('id', postId)
    if (!error) setUserPosts(prev => prev.filter(p => p.id !== postId))
  }

  // Combine news and user posts
  const newsWithType = (newsArticles || []).map(article => ({ ...article, type: 'news' as const }))
  const allFeedItems = [...newsWithType, ...userPosts].sort((a, b) => 
    new Date(b.created_at || b.publishedAt || 0).getTime() - new Date(a.created_at || a.publishedAt || 0).getTime()
  )

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 animate-pulse"><div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-gray-200" /><div className="flex-1"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div></div>
        <div className="bg-white rounded-2xl p-4 animate-pulse"><div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-gray-200" /><div className="flex-1"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <CreatePostForm userId={userId} onPostCreated={loadUserPosts} />
      
      <div className="space-y-3">
        {allFeedItems.map((item) => {
          if (item.type === 'news') {
            return (
              <NewsArticleCard
                key={`news-${item.id}`}
                article={item}
                isLiked={false}
                commentCount={0}
                shareCopied={false}
                onLike={() => {}}
                onComment={() => {}}
                onShare={() => {}}
                onReadInside={() => window.open(item.url, '_blank')}
              />
            )
          } else {
            const author = authors.get(item.user_id)
            return (
              <UserPostCard
                key={`user-${item.id}`}
                post={item}
                author={author}
                currentUserId={userId}
                isLiked={likedPosts.has(item.id)}
                onLike={() => handleLike(item.id)}
                onComment={() => {}}
                onShare={() => {}}
                onDelete={() => handleDeletePost(item.id)}
              />
            )
          }
        })}
        
        {allFeedItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 text-sm">Be the first to share something!</p>
          </div>
        )}
      </div>
    </div>
  )
}
