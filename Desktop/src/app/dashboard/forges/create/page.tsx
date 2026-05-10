'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FORGE_TEMPLATES, ForgeTemplate, getTemplateConfig } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users, Share2, Code2, GitBranch, Palette, Layout, Database,
  Globe, Terminal, Sparkles, ChevronLeft, CheckCircle, Info, Zap,
  MessageCircle, Eye,
} from 'lucide-react'

// Import layout components
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import StoriesStrip from '@/components/dashboard/layout/stories-strip'
import StoryViewer from '@/components/dashboard/stories/story-viewer'  // if you have it

// Map template icons (professional)
const templateIconMap: Record<ForgeTemplate, React.ReactNode> = {
  portfolio: <Palette className="w-6 h-6" />,
  blog: <Layout className="w-6 h-6" />,
  dashboard: <Layout className="w-6 h-6" />,
  api: <Database className="w-6 h-6" />,
  website: <Globe className="w-6 h-6" />,
  component_library: <Terminal className="w-6 h-6" />,
}
const getTemplateIcon = (template: ForgeTemplate) => templateIconMap[template] || <Sparkles className="w-6 h-6" />

export default function CreateForgePage() {
  const supabase = createClient()
  const router = useRouter()

  // --- Forge creation state ---
  const [selectedTemplate, setSelectedTemplate] = useState<ForgeTemplate | null>(null)
  const [forgeName, setForgeName] = useState('')
  const [description, setDescription] = useState('')
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [isPublicPreview, setIsPublicPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // --- Stories strip state ---
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [followedProfiles, setFollowedProfiles] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)

  // --- Load user data for header + stories ---
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)

      // Own profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUserProfile(myProfile)

      // Following IDs
      const { data: allies } = await supabase
        .from('allies')
        .select('following_id')
        .eq('follower_id', user.id)
      const followingIds = (allies || []).map((a: any) => a.following_id)

      // Followed profiles (for stories)
      if (followingIds.length > 0) {
        const { data: fp } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', followingIds)
        setFollowedProfiles(fp || [])
      }

      // Suggested users (for stories strip – people to follow)
      const { data: usersList } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .neq('id', user.id)
        .limit(12)
      const suggested = (usersList || []).filter((u: any) => !followingIds.includes(u.id))
      setSuggestedUsers(suggested)
    }

    loadUserData()
  }, [supabase, router])

  // Combine users for StoriesStrip (current user + followed + suggested)
  const usersWithSelf: any[] = []
  const seen = new Set<string>()
  if (currentUserProfile) {
    usersWithSelf.push(currentUserProfile)
    seen.add(currentUserProfile.id)
  }
  followedProfiles.forEach(p => {
    if (!seen.has(p.id)) {
      usersWithSelf.push(p)
      seen.add(p.id)
    }
  })
  suggestedUsers.forEach(u => {
    if (!seen.has(u.id)) {
      usersWithSelf.push(u)
      seen.add(u.id)
    }
  })

  // --- Forge creation handler (unchanged) ---
  const handleCreate = async () => {
    if (!selectedTemplate || !forgeName || !currentUserId) {
      alert('Please select a template and enter a name')
      return
    }
    setCreating(true)
    try {
      const templateConfig = getTemplateConfig(selectedTemplate)
      const previewToken = isPublicPreview ? `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null

      const response = await fetch('/api/forges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: forgeName,
          template_type: selectedTemplate,
          description: description || null,
          config: templateConfig.defaultConfig,
          is_collaborative: isCollaborative,
          is_public_preview: isPublicPreview,
          preview_token: previewToken,
        }),
      })
      if (!response.ok) throw new Error('Failed to create forge')
      const forge = await response.json()

      if (isCollaborative && forge?.id) {
        await fetch('/api/forges/contributors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forge_id: forge.id,
            user_id: currentUserId,
            role: 'owner',
            is_initial: true,
          }),
        })
      }
      router.push(`/dashboard/forges/${forge.id}/edit`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create forge')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header – tabs not used, but we pass dummy values */}
      <DashboardHeader
        activeTab="forYou"
        onTabChange={() => {}}
        userId={currentUserId || undefined}
      />

      {/* Stories Strip – fully working */}
      <StoriesStrip
        users={usersWithSelf}
        currentUserId={currentUserId}
        onOpenStory={setViewingStoryUserId}
      />

      {/* Main creation form (unchanged from your original, just placed below) */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-12">
        {!selectedTemplate ? (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Select a Template
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {Object.entries(FORGE_TEMPLATES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key as ForgeTemplate)}
                  className="group relative p-5 bg-white border border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-xl transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-purple-600 group-hover:scale-110 transition-transform">
                      {getTemplateIcon(key as ForgeTemplate)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{config.name}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{config.description}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-4 h-4 text-purple-500 rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 mb-6 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Templates
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-7 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-orange-100 text-purple-700">
                      {getTemplateIcon(selectedTemplate)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {FORGE_TEMPLATES[selectedTemplate].name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Fill in the details to create your forge
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Forge Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={forgeName}
                        onChange={(e) => setForgeName(e.target.value)}
                        placeholder="e.g., My Awesome Project"
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell others what your forge is about..."
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px] resize-y"
                      />
                    </div>
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleCreate}
                        disabled={creating || !forgeName.trim()}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold py-3 text-base"
                      >
                        {creating ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </span>
                        ) : (
                          'Create Forge'
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar features (unchanged) */}
              <div className="space-y-5">
                {/* Collaborative */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCollaborative}
                      onChange={(e) => setIsCollaborative(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Users className="w-4 h-4 text-purple-600" />
                        Collaborative
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Invite teammates, manage files, and use approval workflows.
                      </p>
                    </div>
                  </label>
                  {isCollaborative && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Team collaboration, file system, and contributor panel enabled.</span>
                    </div>
                  )}
                </div>

                {/* Public preview */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicPreview}
                      onChange={(e) => setIsPublicPreview(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Share2 className="w-4 h-4 text-purple-600" />
                        Public Preview Link
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Generate a shareable link for anyone to preview your project.
                      </p>
                    </div>
                  </label>
                  {isPublicPreview && (
                    <div className="mt-3 text-sm text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-start gap-2">
                      <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>A public preview link will be created automatically.</span>
                    </div>
                  )}
                </div>

                {/* "What You Get" card */}
                <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-2xl border border-orange-200 p-5">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    What You Get
                  </h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <Code2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Code editor & file uploads</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <GitBranch className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Live project preview</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <MessageCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Comments & collaboration</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <Share2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Easy sharing & feedback</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
                  <Info className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">
                    You can edit all settings later in the forge dashboard.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Story viewer modal (if you have it) */}
      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}
    </div>
  )
}