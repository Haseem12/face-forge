// app/preview/[forgeId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface ForgeFile {
  id: string
  path: string
  content: string
  url: string
  file_type: string
}

interface Forge {
  id: string
  name: string
  description: string | null
  config: {
    files?: ForgeFile[]
  } | null
  is_public_preview: boolean
  is_published: boolean
}

export default async function PreviewPage({ params }: { params: { forgeId: string } }) {
  const supabase = await createClient()
  
  // 1. Fetch forge data
  const { data: forge, error: forgeError } = await supabase
    .from('forges')
    .select('id, name, description, config, is_public_preview, is_published')
    .eq('id', params.forgeId)
    .single()

  if (forgeError || !forge) {
    notFound()
  }

  // 2. Check visibility
  if (!forge.is_public_preview && !forge.is_published) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview Unavailable</h1>
          <p className="text-gray-600 mb-6">
            This forge is not yet published or public preview is disabled.
          </p>
          <p className="text-sm text-gray-500">
            Forge: <strong>{forge.name}</strong>
          </p>
        </div>
      </div>
    )
  }

  // 3. Extract files from config
  const files: ForgeFile[] = forge.config?.files || []
  
  // 4. Find the main HTML file
  const htmlFile = files.find((f: ForgeFile) => 
    f.path.endsWith('.html') || f.path.endsWith('.htm')
  )

  if (!htmlFile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📄</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No HTML File</h1>
          <p className="text-gray-600 mb-6">
            This forge does not contain an HTML file to preview.
          </p>
          <p className="text-sm text-gray-500">
            Forge: <strong>{forge.name}</strong>
          </p>
        </div>
      </div>
    )
  }

  // 5. Get HTML content (either from stored content or fetch from URL)
  let htmlContent = htmlFile.content || ''
  
  if (!htmlContent && htmlFile.url) {
    try {
      const response = await fetch(htmlFile.url, {
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (response.ok) {
        htmlContent = await response.text()
      }
    } catch (error) {
      console.error('Failed to fetch HTML content:', error)
    }
  }

  if (!htmlContent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Unavailable</h1>
          <p className="text-gray-600 mb-6">
            Unable to load the forge content.
          </p>
        </div>
      </div>
    )
  }

  // 6. Replace asset paths with actual URLs
  let finalHtml = htmlContent
  
  // Build a map of filenames to URLs for fast lookup
  const fileMap: Record<string, string> = {}
  files.forEach(file => {
    const fileName = file.path.split('/').pop() || file.path
    fileMap[fileName] = file.url
  })

  // Replace relative paths in src, href, and url() with full URLs
  // This regex matches src="..." href="..." and url(...)
  finalHtml = finalHtml.replace(
    /(src|href)=["']([^"']*)["']|url\(["']?([^"')]*)["']?\)/gi,
    (match, attr, quotedPath, urlPath) => {
      // Determine the actual path
      const path = quotedPath || urlPath
      if (!path) return match
      
      // Skip external URLs or absolute paths
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
        return match
      }
      
      // Extract filename from path
      const fileName = path.split('/').pop()
      if (!fileName) return match
      
      // If we have a matching file, replace with its URL
      if (fileMap[fileName]) {
        // If we matched src/href, replace the quoted value; if url(), replace the inside
        if (attr) {
          return `${attr}="${fileMap[fileName]}"`
        } else {
          return `url("${fileMap[fileName]}")`
        }
      }
      
      // For relative paths that aren't in our file list, try to resolve relative to HTML file's directory
      // Build a base URL from the HTML file's URL
      const htmlBaseUrl = htmlFile.url.substring(0, htmlFile.url.lastIndexOf('/') + 1)
      const resolvedUrl = new URL(path, htmlBaseUrl).toString()
      
      if (attr) {
        return `${attr}="${resolvedUrl}"`
      } else {
        return `url("${resolvedUrl}")`
      }
    }
  )

  // 7. Inject a base tag for relative paths (if not already present)
  if (!finalHtml.includes('<base ')) {
    const htmlBaseUrl = htmlFile.url.substring(0, htmlFile.url.lastIndexOf('/') + 1)
    finalHtml = finalHtml.replace(
      /<head[^>]*>/i,
      (match) => `${match}<base href="${htmlBaseUrl}">`
    )
  }

  // 8. Render the forge
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: finalHtml }}
      className="w-full h-screen overflow-auto"
      style={{ 
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0,
        border: 'none',
        background: '#ffffff'
      }}
    />
  )
}
