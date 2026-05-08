'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X, Loader2, Send, MessageCircle,
} from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import CommentItem from '@/components/dashboard/comments/comment-item'
import type { Comment } from '@/lib/dashboard/types'

export default function CommentPanel({
  articleId,
  forgeId,
  currentUser,
  onClose,
}: {
  articleId?: string
  forgeId?: string
  currentUser: any
  onClose: () => void
}) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const table = articleId ? 'news_comments' : 'forge_comments'
  const idCol = articleId ? 'article_id' : 'forge_id'
  const idValue = articleId || forgeId

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from(table)
        .select('*, profiles:user_id(display_name, username, avatar_url)')
        .eq(idCol, idValue)
        .order('created_at', { ascending: true })

      if (!data) { setLoading(false); return }

      const commentIds = data.map((c: any) => c.id)
      const likeTable = articleId ? 'news_comment_likes' : 'forge_comment_likes'
      const { data: allLikes } = await supabase
        .from(likeTable)
        .select('comment_id, user_id')
        .in('comment_id', commentIds)

      const userLiked = new Set<string>(
        (allLikes || [])
          .filter((l: any) => l.user_id === currentUser?.id)
          .map((l: any) => l.comment_id)
      )
      setLikedComments(userLiked)

      const likeCounts: Record<string, number> = {}
      ;(allLikes || []).forEach((l: any) => {
        likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1
      })

      const map: Record<string, Comment> = {}
      const roots: Comment[] = []
      data.forEach((c: any) => {
        map[c.id] = {
          ...c,
          replies: [],
          like_count: likeCounts[c.id] || 0,
          liked_by_user: userLiked.has(c.id),
        }
      })
      data.forEach((c: any) => {
        if (c.parent_id && map[c.parent_id]) {
          map[c.parent_id].replies!.push(map[c.id])
        } else {
          roots.push(map[c.id])
        }
      })
      setComments(roots)
    } finally {
      setLoading(false)
    }
  }, [supabase, table, idCol, idValue, articleId, currentUser])

  useEffect(() => { loadComments() }, [loadComments])

  const handleLike = async (commentId: string) => {
    if (!currentUser) return
    const likeTable = articleId ? 'news_comment_likes' : 'forge_comment_likes'
    const isLiked = likedComments.has(commentId)
    setLikedComments(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(commentId) : next.add(commentId)
      return next
    })
    const update = (list: Comment[]): Comment[] =>
      list.map(c => ({
        ...c,
        like_count:
          c.id === commentId ? (c.like_count || 0) + (isLiked ? -1 : 1) : c.like_count,
        liked_by_user: c.id === commentId ? !isLiked : c.liked_by_user,
        replies: update(c.replies || []),
      }))
    setComments(prev => update(prev))
    if (isLiked) {
      await supabase.from(likeTable).delete().eq('comment_id', commentId).eq('user_id', currentUser.id)
    } else {
      await supabase.from(likeTable).insert({ comment_id: commentId, user_id: currentUser.id })
    }
  }

  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username })
    setText(`@${username} `)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const submit = async () => {
    if (!currentUser || !text.trim()) return
    setSubmitting(true)
    try {
      await supabase.from(table).insert({
        [idCol]: idValue,
        user_id: currentUser.id,
        content: text.trim(),
        parent_id: replyTo?.id || null,
      })
      setText('')
      setReplyTo(null)
      await loadComments()
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-sm text-gray-800">
            Comments
            {totalCount > 0 && (
              <span className="text-gray-400 font-normal ml-1">({totalCount})</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Be the first to comment</p>
            </div>
          ) : (
            comments.map(c => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onReply={handleReply}
              />
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-3 py-3 bg-white flex-shrink-0">
          {replyTo && (
            <div className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-1.5 mb-2">
              <span className="text-xs text-orange-600 font-medium">
                Replying to @{replyTo.username}
              </span>
              <button onClick={() => { setReplyTo(null); setText('') }}>
                <X className="h-3 w-3 text-orange-400" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <AvatarCircle
              src={currentUser?.user_metadata?.avatar_url}
              name={currentUser?.email}
              size={32}
            />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Add a comment..."
                rows={1}
                disabled={submitting}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                style={{ minHeight: 40, maxHeight: 120 }}
              />
              <button
                onClick={submit}
                disabled={!text.trim() || submitting}
                className="absolute right-2.5 bottom-2.5 text-orange-500 disabled:text-gray-300 transition"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}