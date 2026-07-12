// components/forges/ContributorsPanel.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, X, Shield, Eye, Pencil, Loader2 } from 'lucide-react'

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
  onAddContributor: (userId: string, role: string) => Promise<void> | void
  onRemoveContributor: (userId: string) => Promise<void> | void
  onChangeRole?: (userId: string, role: 'contributor' | 'viewer') => Promise<void> | void
}

const roleBadge: Record<Contributor['role'], { label: string; className: string; icon: React.ReactNode }> = {
  owner: { label: 'Owner', className: 'bg-orange-100 text-orange-700', icon: <Shield className="w-3 h-3" /> },
  contributor: { label: 'Can edit', className: 'bg-green-100 text-green-700', icon: <Pencil className="w-3 h-3" /> },
  viewer: { label: 'View only', className: 'bg-gray-100 text-gray-600', icon: <Eye className="w-3 h-3" /> },
}

export default function ContributorsPanel({
  contributors,
  isOwner,
  forgeId,
  onAddContributor,
  onRemoveContributor,
  onChangeRole,
}: ContributorsPanelProps) {
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState<'contributor' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!inviteUserId.trim()) return
    setInviting(true)
    try {
      await onAddContributor(inviteUserId.trim(), inviteRole)
      setInviteUserId('')
      setInviteRole('viewer')
    } finally {
      setInviting(false)
    }
  }

  const handleToggleRole = async (contributor: Contributor) => {
    if (!onChangeRole || contributor.role === 'owner') return
    const nextRole = contributor.role === 'contributor' ? 'viewer' : 'contributor'
    setBusyUserId(contributor.user_id)
    try {
      await onChangeRole(contributor.user_id, nextRole)
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    setBusyUserId(userId)
    try {
      await onRemoveContributor(userId)
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-600" />
            Invite Someone
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="User ID"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'contributor' | 'viewer')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="viewer">View only</option>
              <option value="contributor">Can edit</option>
            </select>
            <Button onClick={handleInvite} disabled={inviting || !inviteUserId.trim()} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            "View only" lets someone see files and comment without being able to edit. You can change this anytime.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {contributors.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No team members yet</p>
        )}
        {contributors.map((c) => {
          const badge = roleBadge[c.role]
          const isBusy = busyUserId === c.user_id
          return (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-purple-600">
                    {(c.profiles?.display_name || c.profiles?.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {c.profiles?.display_name || c.profiles?.username || c.user_id}
                </p>
                <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.className}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>

              {isOwner && c.role !== 'owner' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleRole(c)}
                    disabled={isBusy}
                    className="text-xs font-medium text-purple-600 hover:text-purple-800 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                    title={c.role === 'contributor' ? 'Restrict to view only' : 'Allow editing'}
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.role === 'contributor' ? 'Restrict' : 'Allow edit'}
                  </button>
                  <button
                    onClick={() => handleRemove(c.user_id)}
                    disabled={isBusy}
                    className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove from forge"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
