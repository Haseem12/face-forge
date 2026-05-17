'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Hash, Sparkles, Image as ImageIcon, Video } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getForgeStyle } from '@/lib/dashboard/constants'

// Category colors mapping for feed posts
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  tech: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  news: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  entertainment: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  gaming: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  sports: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  music: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  art: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  business: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  science: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  lifestyle: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  general: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
}

export interface UnifiedCardProps {
  id: string
  user_id: string
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
  
  // Forge specific
  name?: string
  description?: string
  template_type?: string
  
  // Feed specific - THESE ARE THE KEY FIELDS
  content?: string
  title?: string
  media_url?: string
  media_type?: 'image' | 'video'
  category?: string
  tags?: string[]
  feeling?: string
  feeling_emoji?: string
  
  // Type discriminator - USE THIS to explicitly tell which type it is
  itemType: 'forge' | 'feed'
}

export default function UnifiedCard({
  item,
  isFollowing,
  isLiked,
  currentUserId,
  commentCount,
  onFollow,
  onLike,
  onComment,
  onShare,
  onTagClick,
}: {
  item: UnifiedCardProps
  isFollowing: boolean
  isLiked: boolean
  currentUserId: string
  commentCount: number
  onFollow: () => void
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onTagClick?: (tag: string) => void
}) {
  const creator = item.profiles
  // Use explicit itemType instead of guessing
  const isForge = item.itemType === 'forge'
  const isFeed = item.itemType === 'feed'
  
  // Forge styles
  const forgeStyle = isForge && item.template_type ? getForgeStyle(item.template_type) : null
  
  // Feed styles
  const categoryStyle = isFeed && item.category ? CATEGORY_STYLES[item.category] || CATEGORY_STYLES.general : null
  
  const isImage = item.media_type === 'image'
  const isVideo = item.media_type === 'video'
  const tags = item.tags || []

  // Don't render if no creator
  if (!creator) return null

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden w-full max-w-2xl mx-auto hover:shadow-md transition-all duration-200">
      {/* Creator row */}
      <div className="px-3 xs:px-4 pt-3 pb-2 flex items-center gap-2 xs:gap-3">
        <Link href={`/profile/${creator.username}`}>
          <AvatarCircle src={creator.avatar_url} name={creator.display_name} size={36} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${creator.username}`}>
            <p className="text-sm font-bold truncate hover:text-orange-600 transition">
              {creator.display_name}
            </p>
          </Link>
          <p className="text-[11px] text-gray-400 truncate">
            @{creator.username} · {timeAgo(item.created_at)}
          </p>
        </div>
        
        {/* Badge - Forge type or Feed category */}
        {isForge && item.template_type && (
          <span className="text-[9px] xs:text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">
            {item.template_type}
          </span>
        )}
        
        {isFeed && item.category && item.category !== 'general' && (
          <span className={`text-[9px] xs:text-[10px] font-bold px-2 py-1 rounded-full ${categoryStyle?.bg} ${categoryStyle?.text} uppercase tracking-wide flex-shrink-0 whitespace-nowrap border ${categoryStyle?.border}`}>
            {item.category}
          </span>
        )}
      </div>

      {/* Feeling Indicator (Feed only) */}
      {isFeed && item.feeling && (
        <div className="px-3 xs:px-4 mb-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-2.5 py-1 rounded-full border border-gray-100">
            <span className="text-sm">{item.feeling_emoji || '😊'}</span>
            <span>Feeling {item.feeling}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Link href={isForge ? `/spark/${item.id}` : `/post/${item.id}`}>
        <div className="mx-3 xs:mx-4 mb-3 cursor-pointer">
          {isForge ? (
            // FORGE VISUAL
            <div
              className={`bg-gradient-to-br ${forgeStyle?.from} ${forgeStyle?.to} rounded-xl xs:rounded-2xl p-3 xs:p-4 flex items-center justify-between min-h-[88px] xs:min-h-[96px]`}
            >
              <div className="flex-1 min-w-0 pr-2 xs:pr-3">
                <h2 className="text-sm xs:text-base font-black text-gray-800 line-clamp-1 mb-1">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <span className="text-3xl xs:text-4xl flex-shrink-0">{forgeStyle?.icon || '✨'}</span>
            </div>
          ) : (
            // FEED CONTENT - This is what should show for your posts!
            <div className={`bg-gradient-to-br ${
              item.category === 'tech' ? 'from-blue-50 to-cyan-50' : 
              item.category === 'news' ? 'from-red-50 to-orange-50' :
              item.category === 'gaming' ? 'from-green-50 to-emerald-50' :
              item.category === 'music' ? 'from-pink-50 to-rose-50' :
              item.category === 'art' ? 'from-purple-50 to-indigo-50' :
              'from-gray-50 to-gray-100'} rounded-xl xs:rounded-2xl p-3 xs:p-4 min-h-[88px] xs:min-h-[96px] transition-all hover:shadow-sm`}>
              
              {/* Title */}
              {item.title && (
                <h2 className="text-sm xs:text-base font-black text-gray-800 line-clamp-1 mb-2">
                  {item.title}
                </h2>
              )}
              
              {/* Content - THIS IS WHERE YOUR TEXT SHOULD APPEAR */}
              {item.content && (
                <p className="text-xs xs:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              )}
              
              {/* If no content but has media */}
              {!item.content && item.media_url && (
                <div className="flex items-center gap-2">
                  {isImage && <ImageIcon className="h-4 w-4 text-gray-400" />}
                  {isVideo && <Video className="h-4 w-4 text-gray-400" />}
                  <span className="text-xs text-gray-500">
                    {isImage ? 'Shared an image' : isVideo ? 'Shared a video' : 'Shared media'}
                  </span>
                </div>
              )}
              
              {/* Media indicator */}
              {item.media_url && item.content && (
                <div className="mt-2 flex items-center gap-1">
                  {isImage && <ImageIcon className="h-3 w-3 text-gray-400" />}
                  {isVideo && <Video className="h-3 w-3 text-gray-400" />}
                  <span className="text-[10px] text-gray-400">
                    {isImage ? 'Image attached' : isVideo ? 'Video attached' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Full Media Preview (Feed only - below the content) */}
      {isFeed && item.media_url && (
        <div className="mx-3 xs:mx-4 mb-3">
          <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {isImage ? (
              <img
                src={item.media_url}
                alt={item.title || "Post image"}
                className="w-full h-auto max-h-[350px] object-contain"
              />
            ) : isVideo ? (
              <video
                src={item.media_url}
                controls
                className="w-full max-h-[350px] object-contain"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Tags (Feed only) */}
      {isFeed && tags.length > 0 && (
        <div className="px-3 xs:px-4 mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="inline-flex items-center gap-0.5 text-xs text-orange-500 hover:text-orange-600 hover:underline transition"
            >
              <Hash className="h-3 w-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="px-3 xs:px-4 pt-1 pb-1">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{item.likes_count || 0} likes</span>
          <span>{commentCount || 0} comments</span>
          <span>{item.shares_count || 0} shares</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-gray-100 px-2 xs:px-3 py-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={onLike}
          className={`flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold transition flex-shrink-0 ${
            isLiked ? 'bg-red-50 text-red-500' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
          <span className="hidden sm:inline">Like</span>
        </button>

        <button
          onClick={onComment}
          className="flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">
            {commentCount > 0 ? commentCount : 'Comment'}
          </span>
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="flex-1 min-w-0" />

        {currentUserId !== item.user_id && (
          <button
            onClick={onFollow}
            className={`flex items-center gap-1 h-8 px-3 xs:px-4 rounded-full text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
              isFollowing
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90'
            }`}
          >
            <span className="hidden xs:inline">{isFollowing ? 'Following' : '+ Follow'}</span>
            <span className="xs:hidden">{isFollowing ? '✓' : '+'}</span>
          </button>
        )}
      </div>
    </article>
  )
}
