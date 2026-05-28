// app/dashboard/saved/page.tsx
'use client'

import { useState } from 'react'
import { Bookmark, Heart, Clock, Trash2, Play, Eye, MoreVertical, X } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import Image from 'next/image'

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'videos'>('all')
  
  const savedItems = [
    { id: 1, type: 'post', title: 'Amazing AI Art Tutorial', author: 'CreativeMind', likes: 1234, savedAt: '2 days ago', thumbnail: '/placeholder.jpg' },
    { id: 2, type: 'video', title: 'How to Build a Forge', author: 'TechGuru', likes: 892, savedAt: '3 days ago', thumbnail: '/placeholder.jpg' },
    { id: 3, type: 'post', title: 'Design Tips for Beginners', author: 'DesignMaster', likes: 567, savedAt: '1 week ago', thumbnail: '/placeholder.jpg' },
    { id: 4, type: 'video', title: 'Fitness Routine 2025', author: 'FitLife', likes: 2341, savedAt: '1 week ago', thumbnail: '/placeholder.jpg' },
  ]

  const filteredItems = savedItems.filter(item => {
    if (activeTab === 'all') return true
    if (activeTab === 'posts') return item.type === 'post'
    if (activeTab === 'videos') return item.type === 'video'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-gray-900">Saved</h1>
          </div>
          <p className="text-gray-500 text-sm">Content you've bookmarked for later</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'all', label: 'All', count: savedItems.length },
            { id: 'posts', label: 'Posts', count: savedItems.filter(i => i.type === 'post').length },
            { id: 'videos', label: 'Videos', count: savedItems.filter(i => i.type === 'video').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Saved Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">No saved items yet</h3>
            <p className="text-sm text-gray-500">Save posts and videos to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition group">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.type === 'video' ? (
                      <Play className="h-6 w-6 text-gray-500" />
                    ) : (
                      <Eye className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {item.type === 'video' ? 'Video' : 'Post'}
                          </span>
                          <span className="text-xs text-gray-400">{item.savedAt}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500">by {item.author}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {item.likes} likes
                          </span>
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 rounded-full">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
