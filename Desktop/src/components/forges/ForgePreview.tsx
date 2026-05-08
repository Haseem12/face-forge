'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Lock, Globe } from 'lucide-react'

interface ForgePreviewProps {
  forgeId: string
  forgeTitle: string
  isPublicPreview: boolean
  previewToken: string | null
  onTogglePublic: (isPublic: boolean) => void
}

export default function ForgePreview({
  forgeId,
  forgeTitle,
  isPublicPreview,
  previewToken,
  onTogglePublic,
}: ForgePreviewProps) {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const previewUrl = previewToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/forges/public/${previewToken}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/forges/preview/${forgeId}`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(previewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Project Preview</h2>
        <p className="text-sm text-gray-600">View and share your forge project with others</p>
      </div>

      {/* Visibility Toggle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublicPreview ? (
              <Globe className="w-5 h-5 text-green-600" />
            ) : (
              <Lock className="w-5 h-5 text-gray-600" />
            )}
            <div>
              <p className="font-semibold text-sm text-gray-900">
                {isPublicPreview ? 'Public' : 'Private'} Preview
              </p>
              <p className="text-xs text-gray-500">
                {isPublicPreview
                  ? 'Anyone with the link can view'
                  : 'Only collaborators can view'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => onTogglePublic(!isPublicPreview)}
            variant={isPublicPreview ? 'default' : 'outline'}
            size="sm"
          >
            {isPublicPreview ? 'Make Private' : 'Make Public'}
          </Button>
        </div>
      </div>

      {/* Preview URL */}
      {isPublicPreview && (
        <div className="mb-6 space-y-3">
          <label className="text-sm font-semibold text-gray-900">Share Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-600"
            />
            <Button
              onClick={handleCopyUrl}
              size="sm"
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {/* Preview Button */}
      <div className="space-y-3">
        <Button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
        >
          <Globe className="w-4 h-4" />
          View Preview
        </Button>

        {showPreview && (
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 min-h-96">
            <iframe
              src={`/api/forges/preview/${forgeId}`}
              className="w-full h-96 border-none"
              title={`Preview of ${forgeTitle}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          💡 <strong>Tip:</strong> Your project is rendered from HTML, CSS, and JavaScript files you upload. Make sure to include an index.html file with all the code needed.
        </p>
      </div>
    </div>
  )
}
