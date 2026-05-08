'use client'

import Link from 'next/link'
import { ChevronRight, Zap } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'

export default function Sidebar({
  suggestedUsers,
  followingSet,
  onFollow,
}: {
  suggestedUsers: any[]
  followingSet: Set<string>
  onFollow: (userId: string) => void
}) {
  return (
    <aside className="hidden lg:flex flex-col gap-4">
      {suggestedUsers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-[108px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-800">Who to follow</h3>
            <Link href="/search" className="text-xs font-semibold text-orange-500 hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {suggestedUsers.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center gap-2.5">
                <Link href={`/profile/${u.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                  <AvatarCircle src={u.avatar_url} name={u.display_name} size={34} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{u.display_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">@{u.username}</p>
                  </div>
                </Link>
                <button
                  onClick={() => onFollow(u.id)}
                  className={`flex-shrink-0 text-xs font-bold h-7 px-3 rounded-full transition ${
                    followingSet.has(u.id)
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90'
                  }`}
                >
                  {followingSet.has(u.id) ? '✓' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity stats */}
      <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-2xl border border-orange-100 p-4">
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3">
          Your Activity
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Following', value: followingSet.size },
            { label: 'Saved', value: 0 }, // placeholder – you can pass real data
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spark CTA */}
      <Link href="/spark">
        <div className="bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl p-4 cursor-pointer hover:opacity-95 transition text-white">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5" />
            <span className="font-black text-sm">Explore Spark</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Discover trending forges from creators worldwide
          </p>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/90">
            Browse now <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>

      <p className="text-[11px] text-gray-400 text-center">
        © 2025 FaceForge ·{' '}
        <a href="#" className="hover:underline">Terms</a> ·{' '}
        <a href="#" className="hover:underline">Privacy</a>
      </p>
    </aside>
  )
}