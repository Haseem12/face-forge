'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getForgeStyle } from '@/lib/dashboard/constants'
import type { ForgeFeed } from '@/lib/dashboard/types'

export default function ForgeCard({
  forge,
  isFollowing,
  isLiked,
  currentUserId,
  commentCount,
  onFollow,
  onLike,
  onComment,
}: {
  forge: ForgeFeed
  isFollowing: boolean
  isLiked: boolean
  currentUserId: string
  commentCount: number
  onFollow: () => void
  onLike: () => void
  onComment: () => void
}) {
  const creator = Array.isArray(forge.profiles) ? forge.profiles[0] : forge.profiles as any
  const style = getForgeStyle(forge.template_type)

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden w-full max-w-2xl mx-auto">
      {/* Creator row */}
      <div className="px-3 xs:px-4 pt-3 pb-2 flex items-center gap-2 xs:gap-3">
        <Link href={`/profile/${creator?.username}`}>
          <AvatarCircle src={creator?.avatar_url} name={creator?.display_name} size={36} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${creator?.username}`}>
            <p className="text-sm font-bold truncate hover:text-orange-600 transition">
              {creator?.display_name}
            </p>
          </Link>
          <p className="text-[11px] text-gray-400 truncate">
            @{creator?.username} · {timeAgo(forge.created_at)}
          </p>
        </div>
        <span className="text-[9px] xs:text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">
          {forge.template_type || 'Forge'}
        </span>
      </div>

      {/* Forge visual */}
      <Link href={`/spark/${forge.id}`}>
        <div className="mx-3 xs:mx-4 mb-3 cursor-pointer">
          <div
            className={`bg-gradient-to-br ${style.from} ${style.to} rounded-xl xs:rounded-2xl p-3 xs:p-4 flex items-center justify-between min-h-[88px] xs:min-h-[96px]`}
          >
            <div className="flex-1 min-w-0 pr-2 xs:pr-3">
              <h2 className="text-sm xs:text-base font-black text-gray-800 line-clamp-1 mb-1">
                {forge.name}
              </h2>
              {forge.description && (
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {forge.description}
                </p>
              )}
            </div>
            <span className="text-3xl xs:text-4xl flex-shrink-0">{style.icon}</span>
          </div>
        </div>
      </Link>

      {/* Action bar - Mobile optimized */}
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
          className="flex items-center gap-1 px-2.5 xs:px-3 py-2 rounded-lg xs:rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="flex-1 min-w-0" />

        {currentUserId !== forge.user_id && (
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
