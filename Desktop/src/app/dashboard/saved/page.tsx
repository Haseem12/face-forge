// app/dashboard/saved/page.tsx
'use client'

import { useState } from 'react'
import { Bookmark, Heart, Clock, Trash2, Play, Eye, MoreVertical, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SavedPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts')
  
  const savedItems = [
    { id: 1, type: 'post', title: 'Amazing AI Art Tutorial', author: '@creative_mind', likes: 1234, savedAt: '2d ago', thumbnail: null },
    { id: 2, type: 'video', title: 'How to Build a Forge', author: '@tech_guru', likes: 892, savedAt: '3d ago', thumbnail: null },
    { id: 3, type: 'post', title: 'Design Tips for Beginners', author: '@design_master', likes: 567, savedAt: '1w ago', thumbnail: null },
  ]

  const filteredItems = savedItems.filter(item => item.type === activeTab)

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">Saved</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'posts', label: 'Posts' },
          { id: 'videos', label: 'Videos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-sm font-medium transition relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/40'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Saved Items */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <Bookmark className="h-10 w-10 text-white/30" />
          </div>
          <p className="text-white/40 text-center">No saved {activeTab} yet</p>
          <p className="text-white/20 text-sm">Save content you love</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {filteredItems.map((item) => (
            <div key={item.id} className="px-4 py-3 flex gap-3">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                {item.type === 'video' ? (
                  <Play className="h-6 w-6 text-white/50" />
                ) : (
                  <Eye className="h-6 w-6 text-white/50" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-white/40 text-xs">{item.author}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/30">{item.savedAt}</span>
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <Heart className="h-3 w-3" /> {item.likes}
                      </span>
                    </div>
                  </div>
                  <button className="p-1">
                    <Trash2 className="h-4 w-4 text-white/30" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
