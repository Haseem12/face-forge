'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FORGE_TEMPLATES, ForgeTemplate, getTemplateConfig } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CreateForgePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ForgeTemplate | null>(null)
  const [forgeName, setForgeName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const templates = Object.entries(FORGE_TEMPLATES) as [ForgeTemplate, typeof FORGE_TEMPLATES[ForgeTemplate]][]

  const handleCreate = async () => {
    if (!selectedTemplate || !forgeName) {
      alert('Please select a template and enter a name')
      return
    }

    setCreating(true)
    try {
      const templateConfig = getTemplateConfig(selectedTemplate)
      const response = await fetch('/api/forges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: forgeName,
          template_type: selectedTemplate,
          description: description,
          config: templateConfig.defaultConfig,
        }),
      })

      if (!response.ok) throw new Error('Failed to create forge')

      const forge = await response.json()
      router.push(`/dashboard/forges/${forge.id}/edit`)
    } catch (error) {
      console.error('Error creating forge:', error)
      alert('Failed to create forge')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-16 bg-card border-b border-border z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Create New Forge</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Choose a template and start building</p>
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
            <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-8">Select a Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {templates.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className="p-4 md:p-6 border border-border rounded-lg hover:border-primary hover:shadow-lg transition text-left group"
                >
                  <div className="text-3xl md:text-4xl mb-3 group-hover:scale-125 transition">{config.icon}</div>
                  <h3 className="font-bold text-base md:text-lg mb-2">{config.name}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{config.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-primary hover:underline mb-4 md:mb-6 text-sm flex items-center gap-1"
            >
              ← Back to Templates
            </button>

            <div className="max-w-2xl">
              <h2 className="text-lg md:text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="text-3xl">{FORGE_TEMPLATES[selectedTemplate].icon}</span>
                Create {FORGE_TEMPLATES[selectedTemplate].name}
              </h2>

              <div className="bg-card border border-border rounded-lg p-4 md:p-6 space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Forge Name *</label>
                  <input
                    type="text"
                    value={forgeName}
                    onChange={(e) => setForgeName(e.target.value)}
                    placeholder="e.g., My Amazing Portfolio"
                    className="w-full px-3 py-2 text-sm md:text-base border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of your forge..."
                    className="w-full px-3 py-2 text-sm md:text-base border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                  />
                </div>

                <div className="pt-4 border-t flex flex-col md:flex-row gap-2">
                  <Button 
                    onClick={handleCreate} 
                    disabled={creating} 
                    className="flex-1 text-sm md:text-base"
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
          </>
        )}
      </div>
    </div>
  )
}
