'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Heart, Reply, Trash2 } from 'lucide-react'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  parent_comment_id?: string | null
  profiles?: {
    id: string
    username: string
    avatar_url: string | null
    display_name: string
  }
  replies?: Comment[]
  likes_count?: number
  user_liked?: boolean
}

interface ForgeCommentsProps {
  forgeId: string
  comments: Comment[]
  currentUserId?: string
  onAddComment: (content: string, parentId?: string) => void
  onDeleteComment: (commentId: string) => void
  onLikeComment: (commentId: string) => void
}

export default function ForgeComments({
  forgeId,
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onLikeComment,
}: ForgeCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const handleAddComment = () => {
    if (!newComment.trim()) return
    onAddComment(newComment)
    setNewComment('')
  }

  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return
    onAddComment(replyText, parentId)
    setReplyText('')
    setReplyingTo(null)
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`space-y-3 ${depth > 0 ? 'ml-6 mt-3 pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
          {comment.profiles?.avatar_url ? (
            <Image
              src={comment.profiles.avatar_url}
              alt={comment.profiles.display_name}
              width={32}
              height={32}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            comment.profiles?.display_name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-gray-900">
                {comment.profiles?.display_name}
              </p>
              {currentUserId === comment.user_id && (
                <Button
                  onClick={() => onDeleteComment(comment.id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
            <p className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2 mt-2 text-xs">
            <Button
              onClick={() => onLikeComment(comment.id)}
              variant="ghost"
              size="sm"
              className={`h-6 gap-1 ${comment.user_liked ? 'text-red-600' : 'text-gray-600'}`}
            >
              <Heart className={`w-3 h-3 ${comment.user_liked ? 'fill-red-600' : ''}`} />
              {comment.likes_count || 0}
            </Button>

            {depth < 2 && (
              <Button
                onClick={() => setReplyingTo(comment.id)}
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-gray-600"
              >
                <Reply className="w-3 h-3" />
                Reply
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAddReply(comment.id)}
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                >
                  Reply
                </Button>
                <Button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({comments.length})
        </h2>
      </div>

      {/* Add Comment */}
      {currentUserId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
            >
              <MessageCircle className="w-4 h-4" />
              Post Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.filter(c => !c.parent_comment_id).map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  )
}
