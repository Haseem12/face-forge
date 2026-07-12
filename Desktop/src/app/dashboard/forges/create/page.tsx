// app/dashboard/forges/create/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FORGE_TEMPLATES, ForgeTemplate, getTemplateConfig } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import {
  Users, Share2, Code2, GitBranch, Palette, Layout, Database,
  Globe, Terminal, Sparkles, ChevronLeft, CheckCircle, Zap,
  MessageCircle, Upload, FileArchive, X, Loader2,
  Smartphone, Monitor
} from 'lucide-react'

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

  // ZIP Upload state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)
    }
    getUser()
  }, [supabase, router])

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        showToast('Please select a .zip file', 'error')
        return
      }
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be under 50MB', 'error')
        return
      }
      setZipFile(file)
    }
  }

  const handleCreate = async () => {
    if (!selectedTemplate || !forgeName.trim() || !currentUserId) {
      showToast('Please select a template and enter a name', 'error')
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
          name: forgeName.trim(),
          template_type: selectedTemplate,
          description: description.trim() || null,
          config: templateConfig.defaultConfig,
          is_collaborative: isCollaborative,
          is_public_preview: isPublicPreview,
          preview_token: previewToken,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to create forge')
      }
      const forge = await response.json()

      // Step 2: Add owner as contributor if collaborative.
      // Note: if this fails, ownership still resolves correctly elsewhere —
      // getForgeRole() checks forges.user_id before it ever looks at the
      // forge_contributors table — but we still want to know if it failed,
      // since the Team tab would otherwise show an empty member list.
      if (isCollaborative && forge?.id) {
        const contributorRes = await fetch('/api/forges/contributors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forge_id: forge.id,
            user_id: currentUserId,
            role: 'owner',
            is_initial: true,
          }),
        })
        if (!contributorRes.ok) {
          console.error('Failed to add owner as contributor:', await contributorRes.text().catch(() => ''))
        }
      }

      // Step 3: Upload ZIP if provided
      if (zipFile && forge?.id) {
        setUploading(true)
        setUploadProgress(10)
        
        const formData = new FormData()
        formData.append('file', zipFile)
        formData.append('forgeId', forge.id)

        setUploadProgress(30)

        const uploadResponse = await fetch('/api/forges/upload', {
          method: 'POST',
          body: formData,
        })

        setUploadProgress(80)

        if (uploadResponse.ok) {
          // Build the preview URL ourselves rather than trusting whatever
          // the upload endpoint returns — this keeps every preview in the
          // app going through the one sandboxed, access-controlled route.
          setPreviewUrl(`/api/preview/${forge.id}`)
          setUploadProgress(100)
          showToast('Files uploaded successfully!', 'success')
        } else {
          const errorData = await uploadResponse.json().catch(() => null)
          throw new Error(errorData?.error || 'Failed to upload files')
        }
        setUploading(false)
      }

      // Redirect to edit page
      router.push(`/dashboard/forges/${forge.id}/edit`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create forge', 'error')
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 pb-6 md:pb-8">
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
            <button
              onClick={() => setSelectedTemplate(null)}
              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 mb-4 md:mb-6 text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Templates
            </button>

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
                        maxLength={100}
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
                        maxLength={500}
                        className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
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
                      <p className="text-xs text-gray-400 mt-1">HTML, CSS, JS projects supported (max 50MB)</p>
                      <input ref={fileInputRef} type="file" accept=".zip" onChange={handleZipSelect} className="hidden" />
                    </div>
                  ) : (
                    <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
                      <FileArchive className="w-8 h-8 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{zipFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {zipFile.size < 1024 * 1024 
                            ? `${(zipFile.size / 1024).toFixed(1)} KB` 
                            : `${(zipFile.size / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
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
                        <span className="text-sm text-purple-600 font-medium">
                          {uploadProgress < 100 ? 'Extracting and uploading files...' : 'Upload complete!'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview Toggle */}
                  {previewUrl && !uploading && (
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
                          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                            <span className="text-[10px] text-gray-400 mx-auto">Preview</span>
                          </div>
                          {/*
                            Sandboxed to match the other preview iframes in
                            the app. "allow-same-origin" is deliberately
                            omitted — combined with "allow-scripts" it would
                            let uploaded JS reach this app's cookies/session.
                          */}
                          <iframe
                            src={previewUrl}
                            className="w-full bg-white"
                            style={{ height: 500 }}
                            title="Mobile Preview"
                            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
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
                      <p className="text-xs md:text-sm text-gray-600 mt-1">Invite teammates and use approval workflows.</p>
                    </div>
                  </label>
                  {isCollaborative && (
                    <div className="mt-3 text-xs md:text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Team collaboration, file system, and contributor panel enabled.</span>
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
                      <p className="text-xs md:text-sm text-gray-600 mt-1">Generate a shareable preview link for your project.</p>
                    </div>
                  </label>
                  {isPublicPreview && (
                    <div className="mt-3 text-xs md:text-sm text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>A public preview link will be created automatically.</span>
                    </div>
                  )}
                </div>

                {/* Desktop Create Button */}
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-gray-200 lg:hidden z-30">
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'success' ? 'bg-green-500 text-white' :
            'bg-gray-800 text-white'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
