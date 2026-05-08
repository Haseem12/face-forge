'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Code2, Upload } from 'lucide-react'

interface File {
  id: string
  file_name: string
  file_type: string
  content: string
}

interface FileSegmentEditorProps {
  forgeId: string
  files: File[]
  onAddFile: (file: Omit<File, 'id'>) => void
  onDeleteFile: (fileId: string) => void
  onUpdateFile: (fileId: string, content: string) => void
}

export default function FileSegmentEditor({
  forgeId,
  files,
  onAddFile,
  onDeleteFile,
  onUpdateFile,
}: FileSegmentEditorProps) {
  const [activeFile, setActiveFile] = useState<string | null>(files[0]?.id || null)
  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileType, setNewFileType] = useState('html')
  const [newFileContent, setNewFileContent] = useState('')

  const currentFile = files.find(f => f.id === activeFile)

  const handleAddFile = () => {
    if (!newFileName.trim() || !newFileContent.trim()) return

    onAddFile({
      file_name: newFileName,
      file_type: newFileType,
      content: newFileContent,
    })

    setNewFileName('')
    setNewFileType('html')
    setNewFileContent('')
    setShowNewFile(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const ext = file.name.split('.').pop() || 'txt'
      
      onAddFile({
        file_name: file.name,
        file_type: ext,
        content,
      })
    }
    reader.readAsText(file)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
      {/* File List */}
      <div className="md:col-span-1 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Files</h3>
          <span className="bg-gradient-to-r from-orange-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            {files.length}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {files.map(file => (
            <button
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeFile === file.id
                  ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span className="truncate flex-1">{file.file_name}</span>
              <span className="text-xs opacity-70">.{file.file_type}</span>
            </button>
          ))}
        </div>

        {/* Add File Options */}
        {!showNewFile ? (
          <div className="space-y-2">
            <Button
              onClick={() => setShowNewFile(true)}
              className="w-full gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4" />
              New File
            </Button>
            <label>
              <input
                type="file"
                accept=".html,.css,.js,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                asChild
                variant="outline"
                className="w-full gap-2 cursor-pointer"
              >
                <span>
                  <Upload className="w-4 h-4" />
                  Upload File
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
            <input
              type="text"
              placeholder="File name..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={newFileType}
              onChange={(e) => setNewFileType(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="js">JavaScript</option>
              <option value="json">JSON</option>
              <option value="txt">Text</option>
            </select>
            <div className="flex gap-2">
              <Button
                onClick={handleAddFile}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Create
              </Button>
              <Button
                onClick={() => setShowNewFile(false)}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="md:col-span-3 bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
        {currentFile ? (
          <>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900">{currentFile.file_name}</h3>
                <p className="text-xs text-gray-500">{currentFile.file_type.toUpperCase()}</p>
              </div>
              <Button
                onClick={() => onDeleteFile(currentFile.id)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <textarea
              value={currentFile.content}
              onChange={(e) => onUpdateFile(currentFile.id, e.target.value)}
              className="flex-1 p-4 font-mono text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Paste or type your code here..."
            />

            <div className="mt-4 text-xs text-gray-500">
              Lines: {currentFile.content.split('\n').length} | Size: {currentFile.content.length} bytes
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Create or upload a file to start editing</p>
          </div>
        )}
      </div>
    </div>
  )
}
