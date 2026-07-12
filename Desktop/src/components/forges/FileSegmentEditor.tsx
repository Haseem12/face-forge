// components/forges/FileSegmentEditor.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Save, FileText, Loader2, Eye } from 'lucide-react'

interface ForgeFile {
  id: string
  file_name: string
  file_type: string
  content: string
}

interface FileSegmentEditorProps {
  forgeId: string
  files: ForgeFile[]
  onAddFile: (file: Omit<ForgeFile, 'id'>) => Promise<void> | void
  onDeleteFile: (fileId: string) => Promise<void> | void
  onUpdateFile: (fileId: string, content: string) => Promise<void> | void
  // When false (viewer role), all editing controls are hidden/disabled.
  // Defaults to true so existing callers that don't pass it keep working.
  canEdit?: boolean
}

export default function FileSegmentEditor({
  files,
  onAddFile,
  onDeleteFile,
  onUpdateFile,
  canEdit = true,
}: FileSegmentEditorProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id ?? null)
  const [draftContent, setDraftContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNewFileForm, setShowNewFileForm] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [creating, setCreating] = useState(false)

  const selectedFile = files.find((f) => f.id === selectedFileId) ?? null

  useEffect(() => {
    if (selectedFile) setDraftContent(selectedFile.content || '')
  }, [selectedFile?.id])

  useEffect(() => {
    if (!selectedFileId && files.length > 0) setSelectedFileId(files[0].id)
  }, [files, selectedFileId])

  const isDirty = selectedFile && draftContent !== (selectedFile.content || '')

  const handleSave = async () => {
    if (!selectedFile || !canEdit) return
    setSaving(true)
    try {
      await onUpdateFile(selectedFile.id, draftContent)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newFileName.trim() || !canEdit) return
    setCreating(true)
    try {
      const ext = newFileName.split('.').pop() || 'txt'
      await onAddFile({ file_name: newFileName.trim(), file_type: ext, content: '' })
      setNewFileName('')
      setShowNewFileForm(false)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!canEdit) return
    await onDeleteFile(fileId)
    if (selectedFileId === fileId) {
      setSelectedFileId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* File list */}
      <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Files</span>
          {canEdit ? (
            <button
              onClick={() => setShowNewFileForm((s) => !s)}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
              title="Add file"
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Eye className="w-3 h-3" />
              View only
            </span>
          )}
        </div>

        {showNewFileForm && canEdit && (
          <div className="p-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. about.html"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button onClick={handleCreate} disabled={creating || !newFileName.trim()} size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
            </Button>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {files.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 px-3">No files yet</p>
          )}
          {files.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelectedFileId(f.id)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-l-2 transition-colors ${
                selectedFileId === f.id
                  ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium'
                  : 'border-transparent hover:bg-gray-50 text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <span className="truncate flex-1">{f.file_name}</span>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(f.id)
                  }}
                  className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="md:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-mono text-gray-700">{selectedFile.file_name}</span>
              {canEdit ? (
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Eye className="w-3.5 h-3.5" />
                  Read only
                </span>
              )}
            </div>
            <textarea
              value={draftContent}
              onChange={(e) => canEdit && setDraftContent(e.target.value)}
              readOnly={!canEdit}
              spellCheck={false}
              className={`flex-1 min-h-[400px] p-4 font-mono text-sm resize-none focus:outline-none ${
                canEdit ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-600 cursor-not-allowed'
              }`}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4 min-h-[400px]">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No file selected</p>
            <p className="text-sm text-gray-400 mt-1">
              {canEdit ? 'Select a file, or create a new one' : 'Select a file to view its contents'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
