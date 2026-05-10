'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Globe, Lock, Share2 } from 'lucide-react'

interface PublishForgeModalProps {
  forgeId: string
  forgeName: string
  isOpen: boolean
  onClose: () => void
  onPublish: (visibility: 'private' | 'public') => Promise<void>
}

export default function PublishForgeModal({
  forgeId,
  forgeName,
  isOpen,
  onClose,
  onPublish,
}: PublishForgeModalProps) {
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState<'private' | 'public'>('public')

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await onPublish(visibility)
      setTimeout(onClose, 1500)
    } catch (error) {
      console.error('[v0] Error publishing forge:', error)
    } finally {
      setPublishing(false)
    }
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/forges/${forgeId}`

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Publish {forgeName}</h2>
          <p className="text-sm text-gray-600 mt-1">Share your project with the world</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Visibility Options */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Who can view this forge?
            </label>

            {/* Public Option */}
            <button
              onClick={() => setVisibility('public')}
              className={`w-full p-4 rounded-xl border-2 transition text-left ${
                visibility === 'public'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Globe className={`w-5 h-5 ${visibility === 'public' ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Public</p>
                  <p className="text-sm text-gray-600 mt-0.5">Anyone with the link can view and interact</p>
                </div>
                {visibility === 'public' && <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />}
              </div>
            </button>

            {/* Private Option */}
            <button
              onClick={() => setVisibility('private')}
              className={`w-full p-4 rounded-xl border-2 transition text-left ${
                visibility === 'private'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-orange-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Private</p>
                  <p className="text-sm text-gray-600 mt-0.5">Only collaborators can access this forge</p>
                </div>
                {visibility === 'private' && <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />}
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong> Your project will be listed on the Forges feed and searchable. Contributors can request access to help improve it.
            </p>
          </div>

          {/* Share Link Preview (when public) */}
          {visibility === 'public' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                />
                <Button
                  onClick={copyShareLink}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={publishing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold"
          >
            {publishing ? 'Publishing...' : 'Publish Forge'}
          </Button>
        </div>
      </div>
    </div>
  )
}
