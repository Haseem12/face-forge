'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function FaceCanvas({ layout, profile, isEditable }: { layout: any[]; profile: any; isEditable: boolean }) {
  const [forges, setForges] = useState<any[]>([])
  const [selectedForgeId, setSelectedForgeId] = useState<string | null>(null)
  const [editingLayout, setEditingLayout] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadForges = async () => {
      try {
        const { data: forgesData, error } = await supabase
          .from('forges')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[v0] Error loading forges:', error)
          throw error
        }

        console.log('[v0] Loaded forges for user:', profile.id, forgesData)

        // Filter out unpublished forges if viewing other's profile
        const filteredForges = forgesData?.filter((f) => isEditable || f.is_published) || []
        setForges(filteredForges)
      } catch (error) {
        console.error('[v0] Error loading forges:', error)
      }
    }

    if (profile?.id) {
      loadForges()
    }
  }, [profile?.id, supabase, isEditable])

  const getForgeLayout = (forgeId: string) => {
    return layout.find((l) => l.forge_id === forgeId) || { position_x: 0, position_y: 0, width: 300, height: 300 }
  }

  const handleDragStart = (e: React.DragEvent, forgeId: string) => {
    if (!isEditable) return
    e.dataTransfer.effectAllowed = 'move'
    setSelectedForgeId(forgeId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent) => {
    if (!isEditable) return
    e.preventDefault()

    if (!selectedForgeId) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left)
    const y = Math.max(0, e.clientY - rect.top)

    const layoutItem = getForgeLayout(selectedForgeId)
    const existingLayout = layout.find((l) => l.forge_id === selectedForgeId)

    try {
      if (existingLayout) {
        await fetch('/api/face-layout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingLayout.id,
            position_x: Math.round(x),
            position_y: Math.round(y),
            width: layoutItem.width,
            height: layoutItem.height,
          }),
        })
      } else {
        await fetch('/api/face-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forge_id: selectedForgeId,
            position_x: Math.round(x),
            position_y: Math.round(y),
            width: layoutItem.width,
            height: layoutItem.height,
          }),
        })
      }

      // Refresh layout
      const { data: newLayout } = await supabase
        .from('face_layout')
        .select('*')
        .eq('user_id', profile.id)

      if (newLayout) setEditingLayout(newLayout)
    } catch (error) {
      console.error('Error updating layout:', error)
    }

    setSelectedForgeId(null)
  }

  if (forges.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg bg-muted/50">
        <p className="text-muted-foreground mb-4">No forges created yet</p>
        {isEditable && (
          <Button>
            Create Your First Forge
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className="relative w-full bg-background border border-border rounded-lg overflow-auto"
        style={{ minHeight: '600px' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="relative w-full h-[2000px]">
          {forges.map((forge) => {
            const forgeLayout = getForgeLayout(forge.id)
            return (
              <div
                key={forge.id}
                draggable={isEditable}
                onDragStart={(e) => handleDragStart(e, forge.id)}
                className={`absolute rounded-lg border-2 border-border bg-card p-4 ${
                  isEditable ? 'cursor-move hover:shadow-lg' : ''
                }`}
                style={{
                  left: `${forgeLayout.position_x}px`,
                  top: `${forgeLayout.position_y}px`,
                  width: `${forgeLayout.width}px`,
                  height: `${forgeLayout.height}px`,
                }}
              >
                <h3 className="font-bold text-sm mb-2 truncate">{forge.name}</h3>
                <p className="text-xs text-muted-foreground">{forge.template_type}</p>
              </div>
            )
          })}
        </div>
      </div>

      {isEditable && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 Drag and drop forges to arrange them on your Face. Create new forges in your dashboard.
          </p>
        </div>
      )}
    </div>
  )
}
