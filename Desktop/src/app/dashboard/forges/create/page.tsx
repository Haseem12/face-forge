'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FORGE_TEMPLATES, ForgeTemplate, getTemplateConfig } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, Share2, Code2, GitBranch } from 'lucide-react'

export default function CreateForgePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ForgeTemplate | null>(null)
  const [forgeName, setForgeName] = useState('')
  const [description, setDescription] = useState('')
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [isPublicPreview, setIsPublicPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  const templates = Object.entries(FORGE_TEMPLATES) as [ForgeTemplate, typeof FORGE_TEMPLATES[ForgeTemplate]][]

  const handleCreate = async () => {
    if (!selectedTemplate || !forgeName || !currentUserId) {
      alert('Please select a template and enter a name')
      return
    }

    setCreating(true)
    try {
      const templateConfig = getTemplateConfig(selectedTemplate)
      
      // Generate preview token for public sharing
      const previewToken = isPublicPreview ? `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null

      console.log('[v0] Creating forge with data:', {
        name: forgeName,
        template_type: selectedTemplate,
        is_collaborative: isCollaborative,
        is_public_preview: isPublicPreview,
      })

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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create forge')
      }

      const forge = await response.json()
      console.log('[v0] Forge created:', forge.id)

      // Add creator as owner in contributors table if collaborative
      if (isCollaborative && forge?.id) {
        console.log('[v0] Adding creator as owner to contributors')
        const contribResponse = await fetch('/api/forges/contributors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forge_id: forge.id,
            user_id: currentUserId,
            role: 'owner',
            is_initial: true,
          }),
        })

        const contribData = await contribResponse.json()
        if (!contribResponse.ok) {
          console.error('[v0] Failed to add creator as contributor:', contribData)
          // Don't throw - continue anyway as the forge was created successfully
        } else {
          console.log('[v0] Creator added as owner successfully')
        }
      }

      console.log('[v0] Redirecting to edit page:', forge.id)
      router.push(`/dashboard/forges/${forge.id}/edit`)
    } catch (error) {
      console.error('[v0] Error creating forge:', error)
      alert(error instanceof Error ? error.message : 'Failed to create forge')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-16 bg-white border-b border-gray-200 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-black text-gray-900">Create New Forge</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">Choose a template and set up your collaborative project</p>
          </div>
          <Link href="/dashboard" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-12">
        {!selectedTemplate ? (
          <>
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-8">Select a Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {templates.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className="p-4 md:p-6 bg-white border border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition text-left group"
                >
                  <div className="text-3xl md:text-4xl mb-3 group-hover:scale-125 transition">{config.icon}</div>
                  <h3 className="font-bold text-base md:text-lg text-gray-900 mb-2">{config.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600">{config.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-purple-600 hover:underline mb-4 md:mb-6 text-sm flex items-center gap-1 font-semibold"
            >
              ← Back to Templates
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <span className="text-3xl">{FORGE_TEMPLATES[selectedTemplate].icon}</span>
                      Create {FORGE_TEMPLATES[selectedTemplate].name}
                    </h2>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Forge Name *</label>
                    <input
                      type="text"
                      value={forgeName}
                      onChange={(e) => setForgeName(e.target.value)}
                      placeholder="e.g., My Amazing Portfolio"
                      className="w-full px-4 py-2.5 text-sm md:text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Description (optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A brief description of your forge..."
                      className="w-full px-4 py-2.5 text-sm md:text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-24 resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex flex-col md:flex-row gap-2">
                    <Button 
                      onClick={handleCreate} 
                      disabled={creating || !forgeName.trim()} 
                      className="flex-1 text-sm md:text-base bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-bold"
                    >
                      {creating ? 'Creating...' : 'Create Forge'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedTemplate(null)}
                      className="flex-1 md:flex-none text-sm md:text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>

              {/* Features Sidebar */}
              <div className="space-y-4">
                {/* Collaboration Feature */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="collaborative"
                      checked={isCollaborative}
                      onChange={(e) => setIsCollaborative(e.target.checked)}
                      className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="collaborative" className="cursor-pointer">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Collaborative
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Enable team collaboration with multiple contributors and file management</p>
                    </label>
                  </div>
                  {isCollaborative && (
                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                      ✓ File system, contributors panel, and approval workflow enabled
                    </div>
                  )}
                </div>

                {/* Public Preview Feature */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="public"
                      checked={isPublicPreview}
                      onChange={(e) => setIsPublicPreview(e.target.checked)}
                      className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="public" className="cursor-pointer">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-purple-600" />
                        Public Preview Link
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Generate a shareable link to view your live project online</p>
                    </label>
                  </div>
                  {isPublicPreview && (
                    <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                      ✓ Public link will be generated automatically
                    </div>
                  )}
                </div>

                {/* Features Grid */}
                <div className="bg-gradient-to-br from-orange-50 to-purple-50 border border-orange-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">What You Get</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-xs text-gray-700">
                      <Code2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Code editor & file upload</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-700">
                      <GitBranch className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Live project preview</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-700">
                      <Users className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Comments & collaboration</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-gray-700">
                      <Share2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>Share & get feedback</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
