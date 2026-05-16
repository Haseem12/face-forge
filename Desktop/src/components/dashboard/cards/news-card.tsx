'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, Bell, Heart, MessageCircle, UserPlus,
  Flame, Zap, AtSign, Star, Newspaper, X, Check,
  CheckCheck, Loader2, ChevronRight, Settings, LogOut,
  User, Home, Hash, Bookmark, CircleUser, Menu,
  CreditCard, HelpCircle, Shield, Sparkles, Gem, Award,
  Image as ImageIcon, Video, Smile, MapPin, Calendar,
  Send, Edit3, Trash2, MoreHorizontal, Eye, ExternalLink,
  Copy, Download, Volume2, VolumeX, Play, TrendingUp,
  Code, Music, Gamepad2, Briefcase, HeartHandshake,
  Lightbulb, ShoppingBag, Camera, Mic, Palette, Trophy
} from 'lucide-react'

// ============ Types ============

type PostCategory = 
  | 'tech' 
  | 'news' 
  | 'entertainment' 
  | 'gaming' 
  | 'sports' 
  | 'music' 
  | 'art' 
  | 'business' 
  | 'science' 
  | 'lifestyle'
  | 'education'
  | 'health'

interface UserPost {
  id: string
  user_id: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_at: string
  updated_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned?: boolean
  location?: string
  tags?: string[]
  category: PostCategory
  title?: string
  source_url?: string
}

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string
  interests?: PostCategory[]
}

// ============ Category Configuration ============

const CATEGORIES: { value: PostCategory; label: string; icon: any; color: string; bgColor: string }[] = [
  { value: 'tech', label: 'Technology', icon: Code, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { value: 'news', label: 'Breaking News', icon: Newspaper, color: 'text-red-600', bgColor: 'bg-red-50' },
  { value: 'entertainment', label: 'Entertainment', icon: Popcorn, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'text-green-600', bgColor: 'bg-green-50' },
  { value: 'sports', label: 'Sports', icon: Trophy, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { value: 'music', label: 'Music', icon: Music, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { value: 'art', label: 'Art & Design', icon: Palette, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { value: 'business', label: 'Business', icon: Briefcase, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { value: 'science', label: 'Science', icon: Lightbulb, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { value: 'lifestyle', label: 'Lifestyle', icon: HeartHandshake, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { value: 'education', label: 'Education', icon: GraduationCap, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { value: 'health', label: 'Health & Wellness', icon: Activity, color: 'text-teal-600', bgColor: 'bg-teal-50' },
]

// ============ Search & Recommendation Engine ============

interface SearchResult {
  id: string
  type: 'post' | 'category' | 'user' | 'tag'
  title: string
  description?: string
  image?: string
  category?: PostCategory
  relevance: number
}

function SearchBar({ 
  onSearch, 
  onCategorySelect,
  userId 
}: { 
  onSearch: (query: string) => void
  onCategorySelect: (category: PostCategory) => void
  userId?: string 
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [trendingSearches, setTrendingSearches] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches')
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5))
    
    // Load trending searches
    loadTrendingSearches()
  }, [])

  const loadTrendingSearches = async () => {
    // Get most searched terms from analytics
    const { data } = await supabase
      .from('search_analytics')
      .select('query, count')
      .order('count', { ascending: false })
      .limit(5)
    
    if (data) setTrendingSearches(data.map(d => d.query))
  }

  const saveSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent_searches', JSON.stringify(updated))
    
    // Log search for analytics
    supabase.from('search_analytics').upsert({ 
      query: term, 
      count: 1,
      updated_at: new Date().toISOString()
    })
  }

  const getSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }

    const results: SearchResult[] = []
    const lowerQuery = searchQuery.toLowerCase()

    // 1. Category suggestions
    CATEGORIES.forEach(cat => {
      if (cat.label.toLowerCase().includes(lowerQuery) || cat.value.includes(lowerQuery)) {
        results.push({
          id: `cat-${cat.value}`,
          type: 'category',
          title: cat.label,
          description: `Browse ${cat.label} posts`,
          category: cat.value,
          relevance: 0.9
        })
      }
    })

    // 2. Post suggestions from database
    const { data: posts } = await supabase
      .from('user_posts')
      .select('id, content, title, category')
      .ilike('content', `%${searchQuery}%`)
      .limit(3)
    
    posts?.forEach(post => {
      results.push({
        id: post.id,
        type: 'post',
        title: post.title || post.content.slice(0, 50),
        description: `${post.category} post`,
        category: post.category,
        relevance: 0.7
      })
    })

    // 3. User suggestions
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${searchQuery}%`)
      .limit(2)
    
    users?.forEach(user => {
      results.push({
        id: user.id,
        type: 'user',
        title: user.display_name || user.username,
        description: `@${user.username}`,
        image: user.avatar_url,
        relevance: 0.8
      })
    })

    // 4. Tag suggestions
    const { data: tags } = await supabase
      .from('post_tags')
      .select('tag, count')
      .ilike('tag', `%${searchQuery}%`)
      .limit(2)
    
    tags?.forEach(tag => {
      results.push({
        id: `tag-${tag.tag}`,
        type: 'tag',
        title: `#${tag.tag}`,
        description: `${tag.count} posts`,
        relevance: 0.6
      })
    })

    setSuggestions(results.sort((a, b) => b.relevance - a.relevance))
  }

  useEffect(() => {
    const timeout = setTimeout(() => getSuggestions(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveSearch(searchQuery)
      onSearch(searchQuery)
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          placeholder="Search posts, categories, creators..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
        />
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (query || suggestions.length > 0 || trendingSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {query && suggestions.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-50">
                Suggestions
              </div>
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    if (suggestion.type === 'category' && suggestion.category) {
                      onCategorySelect(suggestion.category)
                    } else if (suggestion.type === 'user') {
                      onSearch(`@${suggestion.title}`)
                    } else if (suggestion.type === 'tag') {
                      onSearch(suggestion.title)
                    } else {
                      handleSearch(suggestion.title)
                    }
                    setShowSuggestions(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition text-left"
                >
                  <div className={`p-1.5 rounded-full ${suggestion.type === 'category' ? CATEGORIES.find(c => c.value === suggestion.category)?.bgColor : 'bg-gray-100'}`}>
                    {suggestion.type === 'category' ? (
                      React.createElement(CATEGORIES.find(c => c.value === suggestion.category)?.icon || Hash, { className: "h-3.5 w-3.5" })
                    ) : suggestion.type === 'user' ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Hash className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
                    <p className="text-xs text-gray-500">{suggestion.description}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                </button>
              ))}
            </div>
          ) : (
            <div>
              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-semibold text-gray-400">TRENDING</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="px-3 py-1 text-xs bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Searches */}
              {recentSearches.length > 0 && !query && (
                <div className="px-3 py-2 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 mb-2">RECENT</div>
                  {recentSearches.map(term => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="w-full px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                    >
                      <Search className="h-3 w-3 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Category Quick Access */}
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 mb-2">BROWSE CATEGORIES</div>
                <div className="grid grid-cols-2 gap-1">
                  {CATEGORIES.slice(0, 6).map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => onCategorySelect(cat.value)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                      <cat.icon className={`h-3 w-3 ${cat.color}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Category Filter Bar ============

function CategoryFilter({ 
  selectedCategory, 
  onSelect,
  showAll = true
}: { 
  selectedCategory: PostCategory | 'all'
  onSelect: (category: PostCategory | 'all') => void
  showAll?: boolean
}) {
  const [showMore, setShowMore] = useState(false)
  const visibleCategories = showMore ? CATEGORIES : CATEGORIES.slice(0, 6)

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
        {showAll && (
          <button
            onClick={() => onSelect('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        )}
        
        {visibleCategories.map(cat => (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              selectedCategory === cat.value
                ? `${cat.bgColor} ${cat.color} ring-1 ring-current ring-opacity-20`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
          </button>
        ))}
        
        {CATEGORIES.length > 6 && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {showMore ? 'Less' : 'More'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============ Create Post Component with Category ============

function CreatePost({ userId, onPostCreated }: { userId: string; onPostCreated: () => void }) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PostCategory>('news')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

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
    
    const preview = URL.createObjectURL(file)
    setMediaPreview(preview)
  }

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile) return null
    
    const fileExt = mediaFile.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = `posts/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filePath, mediaFile)
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return
    
    setIsUploading(true)
    
    try {
      let mediaUrl = null
      if (mediaFile) {
        mediaUrl = await uploadMedia()
      }
      
      const { data: post, error } = await supabase
        .from('user_posts')
        .insert({
          user_id: userId,
          content: content.trim(),
          title: title.trim() || null,
          category,
          media_url: mediaUrl,
          media_type: mediaType,
          tags,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Save tags to post_tags table
      if (tags.length > 0 && post) {
        const tagInserts = tags.map(tag => ({
          post_id: post.id,
          tag: tag.toLowerCase(),
        }))
        await supabase.from('post_tags').insert(tagInserts)
      }
      
      // Reset form
      setContent('')
      setTitle('')
      setTags([])
      if (mediaPreview) URL.revokeObjectURL(mediaPreview)
      setMediaFile(null)
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
          {/* Title Input (optional) */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title (optional)"
            className="w-full mb-2 text-base font-semibold border-0 focus:ring-0 placeholder:text-gray-300 outline-none"
          />
          
          {/* Content Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Share your thoughts, forges, or news..."
            className="w-full resize-none border-0 focus:ring-0 text-gray-700 placeholder:text-gray-400 text-sm outline-none min-h-[60px]"
            rows={1}
          />
          
          {/* Category Picker */}
          <div className="relative mt-2">
            <button
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${selectedCategoryData?.bgColor} ${selectedCategoryData?.color}`}
            >
              {selectedCategoryData && <selectedCategoryData.icon className="h-3 w-3" />}
              {selectedCategoryData?.label}
              <ChevronRight className={`h-3 w-3 transition-transform ${showCategoryPicker ? 'rotate-90' : ''}`} />
            </button>
            
            {showCategoryPicker && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 p-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value)
                      setShowCategoryPicker(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cat.color} hover:${cat.bgColor} transition`}
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Tags Input */}
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tags..."
                className="w-24 text-xs border-0 focus:ring-0 outline-none placeholder:text-gray-400"
              />
              {tagInput && (
                <button onClick={handleAddTag} className="text-orange-500 text-xs">
                  Add
                </button>
              )}
            </div>
          </div>
          
          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100">
              {mediaType === 'image' ? (
                <img src={mediaPreview} alt="Preview" className="max-h-64 w-auto mx-auto object-contain" />
              ) : (
                <video src={mediaPreview} className="max-h-64 w-auto mx-auto" controls />
              )}
              <button
                onClick={() => {
                  if (mediaPreview) URL.revokeObjectURL(mediaPreview)
                  setMediaFile(null)
                  setMediaPreview(null)
                  setMediaType(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <Video className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                <MapPin className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaSelect}
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && !mediaFile) || isUploading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Main News Feed Component with Search & Categories ============

export default function NewsFeed({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<UserPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<UserPost[]>([])
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map())
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all')
  const supabase = createClient()

  const loadPosts = useCallback(async () => {
    try {
      let query = supabase
        .from('user_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      // Apply category filter if not 'all'
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }
      
      const { data: postsData, error: postsError } = await query
      
      if (postsError) throw postsError
      
      setPosts(postsData || [])
      
      // Apply search filter
      let filtered = postsData || []
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        filtered = filtered.filter(post => 
          post.content.toLowerCase().includes(lowerQuery) ||
          post.title?.toLowerCase().includes(lowerQuery) ||
          post.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
      }
      setFilteredPosts(filtered)
      
      // Fetch authors
      const userIds = [...new Set(filtered.map(p => p.user_id))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds)
        
        const authorMap = new Map()
        profilesData?.forEach(profile => {
          authorMap.set(profile.id, profile)
        })
        setAuthors(authorMap)
      }
      
      // Fetch user's likes
      if (userId) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
        
        setLikedPosts(new Set(likesData?.map(l => l.post_id) || []))
      }
      
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, selectedCategory, searchQuery])

  useEffect(() => {
    loadPosts()
    
    // Subscribe to new posts
    const subscription = supabase
      .channel('user_posts_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_posts' }, () => {
        loadPosts()
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [loadPosts, supabase])

  const handleLike = async (postId: string) => {
    if (!userId) return
    
    const isLiked = likedPosts.has(postId)
    
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      
      setLikedPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
      
      setFilteredPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: (p.likes_count || 0) - 1 } : p
      ))
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId })
      
      setLikedPosts(prev => new Set(prev).add(postId))
      
      setFilteredPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
      ))
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Enhanced Search Bar */}
      <div className="mb-4">
        <SearchBar 
          onSearch={setSearchQuery}
          onCategorySelect={(cat) => {
            setSelectedCategory(cat)
            setSearchQuery('')
          }}
          userId={userId}
        />
      </div>
      
      {/* Category Filter */}
      <CategoryFilter 
        selectedCategory={selectedCategory}
        onSelect={(cat) => {
          setSelectedCategory(cat)
          setSearchQuery('')
        }}
      />
      
      {/* Create Post */}
      {userId && <CreatePost userId={userId} onPostCreated={loadPosts} />}
      
      {/* Results count */}
      {searchQuery && (
        <div className="mb-3 text-sm text-gray-500">
          Found {filteredPosts.length} results for "{searchQuery}"
        </div>
      )}
      
      {/* Posts */}
      <div className="space-y-3">
        {filteredPosts.map(post => {
          const author = authors.get(post.user_id)
          if (!author) return null
          
          const categoryData = CATEGORIES.find(c => c.value === post.category)
          
          return (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
              {/* Category Badge */}
              {categoryData && (
                <div className="flex items-center gap-2 mb-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryData.bgColor} ${categoryData.color}`}>
                    <categoryData.icon className="h-3 w-3" />
                    {categoryData.label}
                  </div>
                  {post.title && (
                    <span className="text-xs text-gray-400">•</span>
                  )}
                  {post.title && (
                    <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
                  )}
                </div>
              )}
              
              {/* Post Header */}
              <div className="flex items-start justify-between">
                <Link href={`/profile/${author.username}`} className="flex gap-3 flex-1">
                  {author.avatar_url ? (
                    <Image src={author.avatar_url} alt={author.display_name} width={40} height={40} className="rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {author.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{author.display_name}</p>
                    <p className="text-xs text-gray-500">@{author.username} · {timeAgo(post.created_at)}</p>
                  </div>
                </Link>
              </div>
              
              {/* Content */}
              <div className="mt-2 pl-13">
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.content}</p>
                
                {/* Media */}
                {post.media_url && (
                  <div className="mt-3 rounded-xl overflow-hidden bg-gray-100">
                    {post.media_type === 'image' ? (
                      <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-contain" />
                    ) : (
                      <video src={post.media_url} className="w-full max-h-96 object-contain" controls />
                    )}
                  </div>
                )}
                
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(`#${tag}`)}
                        className="text-xs text-orange-500 hover:text-orange-600"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 pt-2 text-xs text-gray-500">
                  <span>{post.likes_count || 0} likes</span>
                  <span>{post.comments_count || 0} comments</span>
                  <span>{post.shares_count || 0} shares</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-around mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm transition ${
                      likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-red-500' : ''}`} />
                    Like
                  </button>
                  <button className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition">
                    <MessageCircle className="h-4 w-4" />
                    Comment
                  </button>
                  <button className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-gray-500 hover:text-green-500 hover:bg-green-50 transition">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        
        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery 
                ? `No results for "${searchQuery}". Try a different search term.`
                : selectedCategory !== 'all'
                ? `No posts in ${CATEGORIES.find(c => c.value === selectedCategory)?.label} yet.`
                : 'Be the first to share something!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString()
}

// Missing icons
import { Popcorn, GraduationCap, Activity } from 'lucide-react'
