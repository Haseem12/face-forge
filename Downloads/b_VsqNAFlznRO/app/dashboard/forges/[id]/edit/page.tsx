'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTemplateConfig, FORGE_TEMPLATES, ForgeTemplate } from '@/lib/forge-templates'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface Forge {
  id: string
  name: string
  template_type: ForgeTemplate
  description?: string
  config: Record<string, any>
  is_published: boolean
}

export default function EditForgePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const [forge, setForge] = useState<Forge | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [config, setConfig] = useState<Record<string, any>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!params?.id) return

    const loadForge = async () => {
      try {
        const response = await fetch(`/api/forges?id=${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true)
          }
          throw new Error('Failed to load forge')
        }

        const forgeData = await response.json()
        setForge(forgeData)
        setConfig(forgeData.config)
      } catch (error) {
        console.error('Error loading forge:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForge()
  }, [params])

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    if (!forge) return

    setSaving(true)
    try {
      const response = await fetch('/api/forges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: forge.id,
          name: forge.name,
          description: forge.description,
          config: config,
          is_published: forge.is_published,
        }),
      })

      if (!response.ok) throw new Error('Failed to save forge')

      const updated = await response.json()
      setForge(updated)
      alert('Forge saved successfully!')
    } catch (error) {
      console.error('Error saving forge:', error)
      alert('Failed to save forge')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!forge) return

    try {
      const response = await fetch('/api/forges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: forge.id,
          name: forge.name,
          description: forge.description,
          config: config,
          is_published: !forge.is_published,
        }),
      })

      if (!response.ok) throw new Error('Failed to publish')

      const updated = await response.json()
      setForge(updated)
      alert(updated.is_published ? 'Forge published!' : 'Forge unpublished')
    } catch (error) {
      console.error('Error publishing:', error)
      alert('Failed to publish')
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background">
        <Skeleton className="w-full h-24 mb-4" />
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="w-64 h-8 mb-8" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (notFound || !forge) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Forge not found</h1>
          <p className="text-muted-foreground mb-4">The forge you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!forge) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Forge not found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const templateConfig = getTemplateConfig(forge.template_type)

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{forge.name}</h1>
            <p className="text-sm text-muted-foreground">Editing {templateConfig.name} forge</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline">Back</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handlePublish} variant={forge.is_published ? 'destructive' : 'default'}>
              {forge.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Preview</h2>
            <div className="border border-border rounded-lg bg-card p-8 min-h-96">
              <div className="space-y-4">
                {config.title && <h3 className="text-2xl font-bold">{config.title}</h3>}
                {config.subtitle && <p className="text-muted-foreground">{config.subtitle}</p>}
                {config.storeName && <h3 className="text-2xl font-bold">{config.storeName}</h3>}
                {config.message && <p className="whitespace-pre-wrap">{config.message}</p>}

                <div className="pt-4 text-sm text-muted-foreground">
                  <p>Template: {templateConfig.name}</p>
                  <p>Status: {forge.is_published ? '✓ Published' : '○ Draft'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Config Panel */}
          <div>
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-4 bg-card border border-border rounded-lg p-6">
              {templateConfig.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold mb-2">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={config[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={config[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, parseFloat(e.target.value))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              ))}

              {forge.template_type === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Custom Code</label>
                  <textarea
                    value={config.customCode || ''}
                    onChange={(e) => handleConfigChange('customCode', e.target.value)}
                    placeholder="Enter your custom HTML/CSS/JS"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs min-h-48"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
