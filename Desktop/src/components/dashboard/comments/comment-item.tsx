'use client'

import { useState } from 'react'
import { Heart, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'
import type { Comment } from '@/lib/dashboard/types'

export default function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  onLike,
  onReply,
}: {
  comment: Comment
  depth?: number
  currentUserId: string
  onLike: (id: string) => void
  onReply: (id: string, username: string) => void
}) {
  const [showReplies, setShowReplies] = useState(depth < 1)
  const replyCount = comment.replies?.length || 0
  const avatarSize = depth > 0 ? 26 : 32

  return (
    <div className={depth > 0 ? 'ml-8 mt-2' : 'mt-3'}>
      <div className="flex gap-2.5">
        <AvatarCircle
          src={comment.profiles?.avatar_url}
          name={comment.profiles?.display_name}
          size={avatarSize}
        />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-2xl px-3 py-2">
            <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
              <span className="text-xs font-bold text-gray-800 truncate">
                {comment.profiles?.display_name || 'User'}
              </span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                @{comment.profiles?.username} · {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed break-words">
              {comment.content}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1 ml-2">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-[11px] font-semibold transition ${
                comment.liked_by_user ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart
                className={`h-3 w-3 ${comment.liked_by_user ? 'fill-red-500' : ''}`}
              />
              {(comment.like_count || 0) > 0 && <span>{comment.like_count}</span>}
            </button>
            <button
              onClick={() =>
                onReply(comment.id, comment.profiles?.username || '')
              }
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-orange-500 transition"
            >
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
            {replyCount > 0 && (
              <button
                onClick={() => setShowReplies(v => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-purple-500 transition"
              >
                {showReplies ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {showReplies
                  ? 'Hide'
                  : `${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
              </button>
            )}
          </div>

          {showReplies &&
            comment.replies?.map(r => (
              <CommentItem
                key={r.id}
                comment={r}
                depth={depth + 1}
                currentUserId={currentUserId}
                onLike={onLike}
                onReply={onReply}
              />
            ))}
        </div>
      </div>
    </div>
  )
}