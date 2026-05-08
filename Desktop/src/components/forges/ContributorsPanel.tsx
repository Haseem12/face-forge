'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Crown } from 'lucide-react'

interface Contributor {
  id: string
  user_id: string
  role: 'owner' | 'contributor' | 'viewer'
  joined_at: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    display_name: string
  }
}

interface ContributorsPanelProps {
  contributors: Contributor[]
  isOwner: boolean
  forgeId: string
  onAddContributor: (userId: string, role: string) => void
  onRemoveContributor: (userId: string) => void
}

export default function ContributorsPanel({
  contributors,
  isOwner,
  forgeId,
  onAddContributor,
  onRemoveContributor,
}: ContributorsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('contributor')

  const handleAddContributor = async () => {
    if (!searchEmail.trim()) return
    // Implement user search by email first
    // For now, just close the form
    setShowAddForm(false)
    setSearchEmail('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Collaborators</h2>
          <p className="text-sm text-gray-500 mt-1">{contributors.length} members</p>
        </div>
        {isOwner && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && isOwner && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
          <input
            type="email"
            placeholder="Enter email address..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="contributor">Contributor (edit files)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
          <div className="flex gap-2">
            <Button
              onClick={handleAddContributor}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Invite
            </Button>
            <Button
              onClick={() => setShowAddForm(false)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Contributors List */}
      <div className="space-y-3">
        {contributors.map(contributor => (
          <div
            key={contributor.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                {contributor.profiles?.avatar_url ? (
                  <Image
                    src={contributor.profiles.avatar_url}
                    alt={contributor.profiles.display_name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  contributor.profiles?.display_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  {contributor.profiles?.display_name}
                  {contributor.role === 'owner' && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">@{contributor.profiles?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                contributor.role === 'owner'
                  ? 'bg-yellow-100 text-yellow-700'
                  : contributor.role === 'contributor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {contributor.role === 'owner' ? 'Owner' : contributor.role === 'contributor' ? 'Contributor' : 'Viewer'}
              </span>

              {isOwner && contributor.role !== 'owner' && (
                <Button
                  onClick={() => onRemoveContributor(contributor.user_id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 h-8 w-8 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
