// app/dashboard/forges/[id]/edit/page.tsx
'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileSegmentEditor from '@/components/forges/FileSegmentEditor'
import ContributorsPanel from '@/components/forges/ContributorsPanel'
import ForgeComments from '@/components/forges/ForgeComments'
import PublishForgeModal from '@/components/forges/PublishForgeModal'
import {
  Code2, Users, Eye, MessageCircle, Share2, ChevronLeft,
  Upload, FileArchive, X, Loader2, Play, Smartphone, Monitor,
  ExternalLink, RefreshCw
} from 'lucide-react'

interface Forge {
  id: string
  name: string
  description?: string
  is_collaborative: boolean
  is_public_preview: boolean
  preview_token: string | null
  is_published?: boolean
  config?: any
  created_by?: string
  user_id?: string
}

interface ForgeFile {
  id: string
  file_name: string
  file_type: string
  content: string
}

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

interface ForgeComment {
  id: string
  user_id: string
  content: string
  created_at: string
  parent_comment_id?: string | null
}

export default function EditForgePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const supabase = createClient()

  // Forge data state
  const [forge, setForge] = useState<Forge | null>(null)
  const [files, setFiles] = useState<ForgeFile[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [comments, setComments] = useState<ForgeComment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')

  // ZIP Upload state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [showMobilePreview, setShowMobilePreview] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  // Load forge data
  useEffect(() => {
    if (!params?.id) return

    const loadForge = async () => {
      try {
        const forgeRes = await fetch(`/api/forges?id=${params.id}`)
        if (!forgeRes.ok) {
          if (forgeRes.status === 404) setNotFound(true)
          throw new Error('Failed to load forge')
        }
        const forgeData = await forgeRes.json()
        setForge(forgeData)

        // Set preview URL from config
        if (forgeData.config?.files?.length > 0) {
          setPreviewUrl(`/preview/${forgeData.id}`)
        }

        if (forgeData.is_collaborative) {
          // Load files
          const filesRes = await fetch(`/api/forges/files?forge_id=${params.id}`)
          if (filesRes.ok) {
            const filesData = await filesRes.json()
            setFiles(filesData.files || [])
          }

          // Load contributors
          const contribRes = await fetch(`/api/forges/contributors?forge_id=${params.id}`)
          if (contribRes.ok) {
            const contribData = await contribRes.json()
            setContributors(contribData.contributors || [])
          }

          // Load comments
          const commentsRes = await fetch(`/api/forges/comments?forge_id=${params.id}`)
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json()
            setComments(commentsData.comments || [])
          }
        }
      } catch (error) {
        console.error('Error loading forge:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForge()
  }, [params])

  // Check ownership when forge and user are loaded
  useEffect(() => {
    if (forge && currentUserId) {
      if (forge.is_collaborative) {
        const owner = contributors.find(
          (c: Contributor) => c.user_id === currentUserId && c.role === 'owner'
        )
        setIsOwner(!!owner)
      } else {
        setIsOwner(forge.created_by === currentUserId || forge.user_id === currentUserId)
      }
    }
  }, [forge, currentUserId, contributors])

  // ZIP Upload handlers
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

  const handleZipUpload = async () => {
    if (!zipFile || !forge?.id) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', zipFile)
      formData.append('forgeId', forge.id)

      const uploadResponse = await fetch('/api/forges/upload', {
        method: 'POST',
        body: formData,
      })

      if (uploadResponse.ok) {
        setPreviewUrl(`/preview/${forge.id}?v=${Date.now()}`)
        setPreviewKey(prev => prev + 1)
        setZipFile(null)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      alert('Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1)
    setPreviewUrl(`/preview/${forge?.id}?v=${Date.now()}`)
  }

  // File handlers
  const handleAddFile = async (file: Omit<ForgeFile, 'id'>) => {
    if (!forge?.id) return
    try {
      const res = await fetch('/api/forges/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forge_id: forge.id, ...file }),
      })
      if (res.ok) {
        const data = await res.json()
        setFiles(prev => [...prev, data.file])
        refreshPreview()
      }
    } catch (error) {
      console.error('Error adding file:', error)
    }
  }

  const handleUpdateFile = async (fileId: string, content: string) => {
    try {
      const res = await fetch('/api/forges/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, content }),
      })
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f))
        refreshPreview()
      }
    } catch (error) {
      console.error('Error updating file:', error)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch('/api/forges/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      })
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
        refreshPreview()
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleAddContributor = async (userId: string, role: string) => {
    if (!forge?.id) return
    try {
      const res = await fetch('/api/forges/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forge_id: forge.id, user_id: userId, role }),
      })
      if (res.ok) {
        const data = await res.json()
        setContributors(prev => [...prev, data.contributor])
      }
    } catch (error) {
      console.error('Error adding contributor:', error)
    }
  }

  const handleRemoveContributor = async (userId: string) => {
    if (!forge?.id) return
    try {
      const res = await fetch('/api/forges/contributors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forge_id: forge.id, user_id: userId }),
      })
      if (res.ok) {
        setContributors(prev => prev.filter(c => c.user_id !== userId))
      }
    } catch (error) {
      console.error('Error removing contributor:', error)
    }
  }

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!forge?.id || !currentUserId) return
    try {
      const res = await fetch('/api/forges/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forge_id: forge.id, content, parent_comment_id: parentId || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch('/api/forges/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!forge?.id) return
    try {
      const res = await fetch('/api/forges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: forge.id, is_public_preview: isPublic }),
      })
      if (res.ok) {
        const data = await res.json()
        setForge(data)
      }
    } catch (error) {
      console.error('Error toggling public preview:', error)
    }
  }

  const handlePublishForge = async (visibility: 'private' | 'public') => {
    if (!forge?.id) return
    try {
      const res = await fetch('/api/forges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: forge.id, is_published: true, is_public_preview: visibility === 'public' }),
      })
      if (!res.ok) throw new Error('Failed to publish forge')
      const data = await res.json()
      setForge(data)
    } catch (error) {
      console.error('Error publishing forge:', error)
      throw error
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          
          <Skeleton className="w-48 h-8 mb-4" />
          <Skeleton className="w-full h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  // Not found state
  if (notFound || !forge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Forge not found</h1>
          <p className="text-gray-600 mb-4">The forge you're looking for doesn't exist.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
 <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 pb-6 md:pb-8">
        {/* Mobile back button */}
        <button onClick={() => router.back()} className="md:hidden flex items-center gap-1 text-gray-600 mb-4">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-gray-900">{forge.name}</h1>
            {forge.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{forge.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {forge.is_collaborative ? '🤝 Collaborative' : '👤 Solo'} • {forge.is_public_preview ? '🌍 Public' : '🔒 Private'} {forge.is_published && '• ✅ Published'}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {isOwner && !forge.is_published && (
              <Button
                onClick={() => setShowPublishModal(true)}
                className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold text-sm flex-1 md:flex-none"
              >
                <Share2 className="w-4 h-4" />
                Publish
              </Button>
            )}
            <Link href="/dashboard" className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full text-sm">Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6 bg-white border border-gray-200 p-1 rounded-lg gap-1">
            <TabsTrigger value="preview" className="gap-1.5 flex items-center text-xs md:text-sm px-2">
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 flex items-center text-xs md:text-sm px-2">
              <Code2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 flex items-center text-xs md:text-sm px-2">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 flex items-center text-xs md:text-sm px-2">
              <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* PREVIEW TAB */}
          <TabsContent value="preview" className="space-y-4">
            {isOwner && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FileArchive className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900 text-sm md:text-base">Upload Project Files (ZIP)</h3>
                </div>

                {!zipFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all active:scale-[0.99]"
                  >
                    <Upload className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Tap to select a .zip file</p>
                    <p className="text-xs text-gray-400 mt-0.5">HTML, CSS, JS projects</p>
                    <input ref={fileInputRef} type="file" accept=".zip" onChange={handleZipSelect} className="hidden" />
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded-xl p-3 md:p-4 flex items-center gap-3">
                    <FileArchive className="w-8 h-8 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{zipFile.name}</p>
                      <p className="text-xs text-gray-500">{(zipFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setZipFile(null)} className="p-1.5 rounded-full hover:bg-purple-100">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                    <Button onClick={handleZipUpload} disabled={uploading} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMobilePreview(true)}
                    className={`p-1.5 rounded-lg transition-colors ${showMobilePreview ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowMobilePreview(false)}
                    className={`p-1.5 rounded-lg transition-colors ${!showMobilePreview ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={refreshPreview} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {previewUrl ? (
                <div className={showMobilePreview ? 'flex justify-center bg-gray-800 p-4' : ''}>
                  <div
                    className={showMobilePreview ? 'rounded-2xl overflow-hidden border-4 border-gray-700 shadow-2xl' : 'w-full'}
                    style={showMobilePreview ? { maxWidth: 375, height: 600 } : { height: 'calc(100vh - 350px)', minHeight: 400 }}
                  >
                    {showMobilePreview && (
                      <div className="bg-gray-800 px-3 py-1.5 flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                        <span className="text-[10px] text-gray-400 mx-auto">{forge.name}</span>
                      </div>
                    )}
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      key={previewKey}
                      className="w-full h-full bg-white"
                      title="Forge Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Play className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No preview available</p>
                  <p className="text-sm text-gray-400 mt-1">Upload a ZIP file or add files to see a live preview</p>
                </div>
              )}
            </div>

            {isOwner && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forge.is_public_preview}
                    onChange={(e) => handleTogglePublic(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                      <Share2 className="w-4 h-4 text-purple-600" />
                      Public Preview Link
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Anyone with the link can view the preview</p>
                  </div>
                </label>
              </div>
            )}
          </TabsContent>

          {/* FILES TAB */}
          <TabsContent value="files" className="space-y-6">
            {forge.is_collaborative ? (
              <FileSegmentEditor
                forgeId={forge.id}
                files={files}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onUpdateFile={handleUpdateFile}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Code2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Collaborative mode not enabled</p>
                <p className="text-sm text-gray-500 mt-1">Enable collaboration to access the file editor</p>
              </div>
            )}
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team" className="space-y-6">
            {forge.is_collaborative ? (
              <ContributorsPanel
                contributors={contributors}
                isOwner={isOwner}
                forgeId={forge.id}
                onAddContributor={handleAddContributor}
                onRemoveContributor={handleRemoveContributor}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Collaborative mode not enabled</p>
                <p className="text-sm text-gray-500 mt-1">Enable collaboration to manage your team</p>
              </div>
            )}
          </TabsContent>

          {/* COMMENTS TAB */}
          <TabsContent value="comments" className="space-y-6">
            <ForgeComments
              forgeId={forge.id}
              comments={comments}
              currentUserId={currentUserId || undefined}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onLikeComment={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Sticky Preview Button */}
      {previewUrl && (
        <div className="fixed bottom-20 right-4 z-30 md:hidden">
          <button
            onClick={() => {
              setActiveTab('preview')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="w-12 h-12 rounded-full bg-purple-600 shadow-lg flex items-center justify-center active:bg-purple-700 transition-all"
          >
            <Play className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Publish Modal */}
      <PublishForgeModal
        forgeId={forge?.id || ''}
        forgeName={forge?.name || ''}
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublishForge}
      />
    </div>
  )
}
