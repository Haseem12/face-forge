// app/dashboard/forges/create/page.tsx (adjust path as needed)
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FORGE_TEMPLATES, ForgeTemplate, getTemplateConfig } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users, Share2, Code2, GitBranch, Palette, Layout, Database,
  Globe, Terminal, Sparkles, ChevronLeft, CheckCircle, Info, Zap,
  MessageCircle, Eye, Upload, FileArchive, X, Loader2, Play,
  Smartphone, Monitor
} from 'lucide-react'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import StoriesStrip from '@/components/dashboard/layout/stories-strip'
import StoryViewer from '@/components/dashboard/stories/story-viewer'

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

  const [selectedTemplate, setSelectedTemplate] = useState<ForgeTemplate | null>(null)
  const [forgeName, setForgeName] = useState('')
  const [description, setDescription] = useState('')
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [isPublicPreview, setIsPublicPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [followedProfiles, setFollowedProfiles] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)

  // ZIP Upload state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setCurrentUserId(user.id)
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUserProfile(myProfile)
      const { data: allies } = await supabase.from('allies').select('following_id').eq('follower_id', user.id)
      const followingIds = (allies || []).map((a: any) => a.following_id)
      if (followingIds.length > 0) {
        const { data: fp } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', followingIds)
        setFollowedProfiles(fp || [])
      }
      const { data: usersList } = await supabase.from('profiles').select('id, display_name, username, avatar_url').neq('id', user.id).limit(12)
      const suggested = (usersList || []).filter((u: any) => !followingIds.includes(u.id))
      setSuggestedUsers(suggested)
    }
    loadUserData()
  }, [supabase, router])

  const usersWithSelf: any[] = []
  const seen = new Set<string>()
  if (currentUserProfile) { usersWithSelf.push(currentUserProfile); seen.add(currentUserProfile.id) }
  followedProfiles.forEach(p => { if (!seen.has(p.id)) { usersWithSelf.push(p); seen.add(p.id) } })
  suggestedUsers.forEach(u => { if (!seen.has(u.id)) { usersWithSelf.push(u); seen.add(u.id) } })

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        alert('Please select a .zip file')
        return
      }
      setZipFile(file)
    }
  }

  const handleCreate = async () => {
    if (!selectedTemplate || !forgeName || !currentUserId) {
      alert('Please select a template and enter a name')
      return
    }
    setCreating(true)
    try {
      const templateConfig = getTemplateConfig(selectedTemplate)
      const previewToken = isPublicPreview ? `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null

      // Step 1: Create the forge
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

      // Step 2: Add owner as contributor if collaborative
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

      // Step 3: Upload ZIP if provided
      if (zipFile && forge?.id) {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', zipFile)
        formData.append('forgeId', forge.id)

        const uploadResponse = await fetch('/api/forges/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          setPreviewUrl(uploadResult.previewUrl)
        }
        setUploading(false)
      }

      // Redirect to edit page
      router.push(`/dashboard/forges/${forge.id}/edit`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create forge')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader activeTab="forYou" onTabChange={() => {}} userId={currentUserId || undefined} />
      <StoriesStrip users={usersWithSelf} currentUserId={currentUserId} onOpenStory={setViewingStoryUserId} />

      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 pb-24 md:pb-12">
        {/* Mobile back button */}
        <button onClick={() => router.back()} className="md:hidden flex items-center gap-1 text-gray-600 mb-4">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {!selectedTemplate ? (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Select a Template
            </h2>
            {/* Mobile: 2-column grid, Desktop: 3-column */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {Object.entries(FORGE_TEMPLATES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key as ForgeTemplate)}
                  className="group relative p-4 md:p-5 bg-white border border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-xl active:scale-[0.98] transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-3">
                    <div className="text-purple-600 group-hover:scale-110 transition-transform shrink-0">
                      {getTemplateIcon(key as ForgeTemplate)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm md:text-base text-gray-900 mb-1">{config.name}</h3>
                      <p className="text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-2">{config.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Back button */}
            <button
              onClick={() => setSelectedTemplate(null)}
              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 mb-4 md:mb-6 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Templates
            </button>

            {/* Mobile: single column, Desktop: 2-column + sidebar */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-8">
              {/* Main form */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6 order-2 lg:order-1">
                {/* Name & Description Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-7 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-orange-100 text-purple-700">
                      {getTemplateIcon(selectedTemplate)}
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900">
                        {FORGE_TEMPLATES[selectedTemplate].name}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-500">Fill in the details</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                        Forge Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={forgeName}
                        onChange={(e) => setForgeName(e.target.value)}
                        placeholder="e.g., My Awesome Project"
                        className="w-full px-4 py-2.5 md:py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                        Description (optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell others what your forge is about..."
                        rows={3}
                        className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ZIP Upload Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-7 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <FileArchive className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Upload Project Files (ZIP)</h3>
                  </div>
                  
                  {!zipFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-6 md:p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all active:scale-[0.99]"
                    >
                      <Upload className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm md:text-base text-gray-600 font-medium">Tap to select a .zip file</p>
                      <p className="text-xs text-gray-400 mt-1">HTML, CSS, JS projects supported</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleZipSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
                      <FileArchive className="w-8 h-8 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{zipFile.name}</p>
                        <p className="text-xs text-gray-500">{(zipFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => { setZipFile(null); setPreviewUrl(null) }}
                        className="p-1.5 rounded-full hover:bg-purple-100 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-purple-600 font-medium">Extracting files...</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mobile Preview Toggle */}
                  {previewUrl && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowMobilePreview(!showMobilePreview)}
                        className="flex items-center gap-2 text-sm text-purple-600 font-medium hover:text-purple-800 transition-colors"
                      >
                        {showMobilePreview ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        {showMobilePreview ? 'Show Desktop Preview' : 'Show Mobile Preview'}
                      </button>
                      
                      {showMobilePreview && (
                        <div className="mt-3 rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg mx-auto" style={{ maxWidth: 375 }}>
                          {/* Mobile frame top bar */}
                          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                            <span className="text-[10px] text-gray-400 mx-auto">Preview</span>
                          </div>
                          <iframe
                            src={previewUrl}
                            className="w-full bg-white"
                            style={{ height: 500 }}
                            title="Mobile Preview"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar - Mobile: above form, Desktop: sidebar */}
              <div className="space-y-3 md:space-y-5 order-1 lg:order-2">
                {/* Collaborative Toggle */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm active:bg-gray-50 transition-colors">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCollaborative}
                      onChange={(e) => setIsCollaborative(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm md:text-base">
                        <Users className="w-4 h-4 text-purple-600" />
                        Collaborative
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        Invite teammates and use approval workflows.
                      </p>
                    </div>
                  </label>
                  {isCollaborative && (
                    <div className="mt-3 text-xs md:text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Team collaboration enabled.</span>
                    </div>
                  )}
                </div>

                {/* Public Preview Toggle */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicPreview}
                      onChange={(e) => setIsPublicPreview(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm md:text-base">
                        <Share2 className="w-4 h-4 text-purple-600" />
                        Public Preview Link
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        Generate a shareable preview link.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Create Button - Mobile sticky */}
                <div className="hidden lg:block">
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !forgeName.trim() || uploading}
                    className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold py-3 text-base rounded-xl"
                  >
                    {creating || uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploading ? 'Uploading...' : 'Creating...'}
                      </span>
                    ) : (
                      'Create Forge'
                    )}
                  </Button>
                </div>

                {/* "What You Get" card */}
                <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-2xl border border-orange-200 p-4 hidden lg:block">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    What You Get
                  </h4>
                  <ul className="space-y-2">
                    {[
                      { icon: Code2, text: 'Code editor & file uploads' },
                      { icon: GitBranch, text: 'Live project preview' },
                      { icon: MessageCircle, text: 'Comments & collaboration' },
                      { icon: Share2, text: 'Easy sharing & feedback' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <item.icon className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Mobile Sticky Create Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-gray-200 lg:hidden z-30 pb-safe">
              <Button
                onClick={handleCreate}
                disabled={creating || !forgeName.trim() || uploading}
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold py-3.5 text-base rounded-xl active:scale-[0.98] transition-transform"
              >
                {creating || uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploading ? 'Uploading...' : 'Creating...'}
                  </span>
                ) : (
                  'Create Forge'
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}
    </div>
  )
}
