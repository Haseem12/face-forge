'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileSegmentEditor from '@/components/forges/FileSegmentEditor'
import ContributorsPanel from '@/components/forges/ContributorsPanel'
import ForgePreview from '@/components/forges/ForgePreview'
import ForgeComments from '@/components/forges/ForgeComments'
import { Code2, Users, Eye, MessageCircle } from 'lucide-react'

interface Forge {
  id: string
  name: string
  description?: string
  is_collaborative: boolean
  is_public_preview: boolean
  preview_token: string | null
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
  const [forge, setForge] = useState<Forge | null>(null)
  const [files, setFiles] = useState<ForgeFile[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [comments, setComments] = useState<ForgeComment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    if (!params?.id) return

    const loadForge = async () => {
      try {
        // Load forge data
        const forgeRes = await fetch(`/api/forges?id=${params.id}`)
        if (!forgeRes.ok) {
          if (forgeRes.status === 404) setNotFound(true)
          throw new Error('Failed to load forge')
        }
        const forgeData = await forgeRes.json()
        setForge(forgeData)

        // Load files if collaborative
        if (forgeData.is_collaborative) {
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

            // Check if current user is owner
            if (currentUserId) {
              const owner = contribData.contributors?.find((c: Contributor) => c.user_id === currentUserId && c.role === 'owner')
              setIsOwner(!!owner)
            }
          }

          // Load comments
          const commentsRes = await fetch(`/api/forges/comments?forge_id=${params.id}`)
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json()
            setComments(commentsData.comments || [])
          }
        }
      } catch (error) {
        console.error('[v0] Error loading forge:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForge()
  }, [params, currentUserId])

  const handleAddFile = async (file: Omit<ForgeFile, 'id'>) => {
    if (!forge?.id) return

    try {
      const res = await fetch('/api/forges/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forge_id: forge.id,
          ...file,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setFiles([...files, data.file])
      }
    } catch (error) {
      console.error('[v0] Error adding file:', error)
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
        setFiles(files.map(f => f.id === fileId ? { ...f, content } : f))
      }
    } catch (error) {
      console.error('[v0] Error updating file:', error)
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
        setFiles(files.filter(f => f.id !== fileId))
      }
    } catch (error) {
      console.error('[v0] Error deleting file:', error)
    }
  }

  const handleAddContributor = async (userId: string, role: string) => {
    if (!forge?.id) return

    try {
      const res = await fetch('/api/forges/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forge_id: forge.id,
          user_id: userId,
          role,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setContributors([...contributors, data.contributor])
      }
    } catch (error) {
      console.error('[v0] Error adding contributor:', error)
    }
  }

  const handleRemoveContributor = async (userId: string) => {
    if (!forge?.id) return

    try {
      const res = await fetch('/api/forges/contributors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forge_id: forge.id,
          user_id: userId,
        }),
      })

      if (res.ok) {
        setContributors(contributors.filter(c => c.user_id !== userId))
      }
    } catch (error) {
      console.error('[v0] Error removing contributor:', error)
    }
  }

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!forge?.id || !currentUserId) return

    try {
      const res = await fetch('/api/forges/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forge_id: forge.id,
          content,
          parent_comment_id: parentId || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments([...comments, data.comment])
      }
    } catch (error) {
      console.error('[v0] Error adding comment:', error)
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
        setComments(comments.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('[v0] Error deleting comment:', error)
    }
  }

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!forge?.id) return

    try {
      const res = await fetch('/api/forges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: forge.id,
          is_public_preview: isPublic,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setForge(data)
      }
    } catch (error) {
      console.error('[v0] Error toggling public preview:', error)
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Skeleton className="w-full h-24 mb-4" />
        <div className="max-w-6xl mx-auto px-4">
          <Skeleton className="w-64 h-8 mb-8" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (notFound || !forge) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Forge not found</h1>
          <p className="text-gray-600 mb-4">The forge you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-16 bg-white border-b border-gray-200 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-black text-gray-900">{forge.name}</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {forge.is_collaborative ? '🤝 Collaborative' : '👤 Solo'} • {forge.is_public_preview ? '🌍 Public' : '🔒 Private'}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {forge.is_collaborative ? (
          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-white border border-gray-200 p-1 rounded-lg">
              <TabsTrigger value="files" className="gap-2 flex items-center">
                <Code2 className="w-4 h-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2 flex items-center">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2 flex items-center">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2 flex items-center">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Comments</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-6">
              <FileSegmentEditor
                forgeId={forge.id}
                files={files}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onUpdateFile={handleUpdateFile}
              />
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <ForgePreview
                forgeId={forge.id}
                forgeTitle={forge.name}
                isPublicPreview={forge.is_public_preview}
                previewToken={forge.preview_token}
                onTogglePublic={handleTogglePublic}
              />
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <ContributorsPanel
                contributors={contributors}
                isOwner={isOwner}
                forgeId={forge.id}
                onAddContributor={handleAddContributor}
                onRemoveContributor={handleRemoveContributor}
              />
            </TabsContent>

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
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">This forge is not set up for collaboration. Enable collaborative mode to access file editor, contributors, and comments.</p>
          </div>
        )}
      </div>
    </div>
  )
}
