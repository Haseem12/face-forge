'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Hash, Image as ImageIcon, Video, Sparkles } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'

// Category colors mapping
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; from: string; to: string }> = {
  tech: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', from: 'from-blue-50', to: 'to-cyan-50' },
  news: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', from: 'from-red-50', to: 'to-orange-50' },
  entertainment: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', from: 'from-purple-50', to: 'to-pink-50' },
  gaming: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', from: 'from-green-50', to: 'to-emerald-50' },
  sports: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', from: 'from-orange-50', to: 'to-amber-50' },
  music: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', from: 'from-pink-50', to: 'to-rose-50' },
  art: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', from: 'from-indigo-50', to: 'to-purple-50' },
  business: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', from: 'from-emerald-50', to: 'to-teal-50' },
  science: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', from: 'from-cyan-50', to: 'to-blue-50' },
  lifestyle: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', from: 'from-rose-50', to: 'to-pink-50' },
  general: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', from: 'from-gray-50', to: 'to-gray-100' },
}

export interface FeedPost {
  id: string
  user_id: string
  content: string
  title?: string
  media_url?: string
  media_type?: 'image' | 'video'
  category?: string
  tags?: string[]
  feeling?: string
  feeling_emoji?: string
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
}

export default function FeedCard({
  post,
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
  post: FeedPost
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
  const creator = post.profiles
  const categoryStyle = CATEGORY_STYLES[post.category || 'general'] || CATEGORY_STYLES.general
  const isImage = post.media_type === 'image'
  const isVideo = post.media_type === 'video'
  const tags = post.tags || []

  if (!creator) return null

  // Get feeling emoji
  const getFeelingDisplay = () => {
    if (!post.feeling) return null
    const feelingMap: Record<string, string> = {
      Happy: '😊', Loving: '❤️', Grateful: '🙏', Sad: '😢',
      Okay: '😐', Excited: '🎉', Chilling: '😎', Celebrating: '🥳'
    }
    return {
      emoji: post.feeling_emoji || feelingMap[post.feeling] || '😊',
      label: post.feeling
    }
  }
  
  const feeling = getFeelingDisplay()

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden w-full max-w-2xl mx-auto hover:shadow-md transition-all duration-200">
      {/* Creator row - Same as ForgeCard */}
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
            @{creator.username} · {timeAgo(post.created_at)}
          </p>
        </div>
        
        {/* Category Badge - Same style as forge template badge */}
        {post.category && post.category !== 'general' && (
          <span className={`text-[9px] xs:text-[10px] font-bold px-2 py-1 rounded-full ${categoryStyle.bg} ${categoryStyle.text} uppercase tracking-wide flex-shrink-0 whitespace-nowrap border ${categoryStyle.border}`}>
            {post.category}
          </span>
        )}
      </div>

      {/* Feeling Indicator */}
      {feeling && (
        <div className="px-3 xs:px-4 mb-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-2.5 py-1 rounded-full border border-gray-100">
            <span className="text-sm">{feeling.emoji}</span>
            <span>Feeling {feeling.label}</span>
          </div>
        </div>
      )}

      {/* Post Content Block - Styled like forge visual */}
      <Link href={`/post/${post.id}`}>
        <div className="mx-3 xs:mx-4 mb-3 cursor-pointer">
          <div className={`bg-gradient-to-br ${categoryStyle.from} ${categoryStyle.to} rounded-xl xs:rounded-2xl p-3 xs:p-4 min-h-[88px] xs:min-h-[96px] transition-all hover:shadow-sm`}>
            
            {/* Title */}
            {post.title && (
              <h2 className="text-sm xs:text-base font-black text-gray-800 line-clamp-1 mb-2">
                {post.title}
              </h2>
            )}
            
            {/* Content Text */}
            {post.content && (
              <p className="text-xs xs:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                {post.content}
              </p>
            )}
            
            {/* Media indicator */}
            {post.media_url && (
              <div className="mt-2 flex items-center gap-1">
                {isImage && <ImageIcon className="h-3 w-3 text-gray-400" />}
                {isVideo && <Video className="h-3 w-3 text-gray-400" />}
                <span className="text-[10px] text-gray-400">
                  {isImage ? 'Image attached' : isVideo ? 'Video attached' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Full Media Preview (below the content) */}
      {post.media_url && (
        <div className="mx-3 xs:mx-4 mb-3">
          <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {isImage ? (
              <img
                src={post.media_url}
                alt={post.title || "Post image"}
                className="w-full h-auto max-h-[350px] object-contain"
              />
            ) : isVideo ? (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-[350px] object-contain"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
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

      {/* Stats row - Same as ForgeCard */}
      <div className="px-3 xs:px-4 pt-1 pb-1">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{post.likes_count || 0} likes</span>
          <span>{commentCount || 0} comments</span>
          <span>{post.shares_count || 0} shares</span>
        </div>
      </div>

      {/* Action bar - Same as ForgeCard */}
      <div className="border-t border-gray-100 px-2 xs:px-3 py-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={onLike}
          className={`flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold transition flex-shrink-0 ${
            isLiked ? 'bg-red-50 text-red-500' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Like"
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
          <span className="hidden sm:inline">Like</span>
        </button>

        <button
          onClick={onComment}
          className="flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
          title="Comment"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">
            {commentCount > 0 ? commentCount : 'Comment'}
          </span>
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="flex-1 min-w-0" />

        {currentUserId !== post.user_id && (
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
