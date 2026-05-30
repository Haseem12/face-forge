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

export default async function PreviewPage({ params }: { params: { forgeId: string } }) {
  const supabase = await createClient()
  
  // Fetch forge data
  const { data: forge, error: forgeError } = await supabase
    .from('forges')
    .select('id, name, description, config, is_public_preview, is_published')
    .eq('id', params.forgeId)
    .single()

  if (forgeError || !forge) {
    notFound()
  }

  // Check if forge is accessible (public preview or published)
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

  const config = forge.config || {}
  const files: ForgeFile[] = config.files || []
  
  // Find HTML file
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No HTML File Found</h1>
          <p className="text-gray-600 mb-6">
            This forge doesn't have an HTML file to preview.
          </p>
          <p className="text-sm text-gray-500">
            Forge: <strong>{forge.name}</strong>
          </p>
        </div>
      </div>
    )
  }

  // Fetch the HTML content
  let htmlContent = htmlFile.content || ''
  
  // If content is not available but URL is, fetch it
  if (!htmlContent && htmlFile.url) {
    try {
      const response = await fetch(htmlFile.url)
      htmlContent = await response.text()
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

  // Replace asset paths with actual URLs
  let finalHtml = htmlContent
  
  files.forEach((file: ForgeFile) => {
    const fileName = file.path.split('/').pop() || file.path
    
    // Replace relative paths in src and href attributes
    const patterns = [
      new RegExp(`src=["']([^"']*${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi'),
      new RegExp(`href=["']([^"']*${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi'),
      new RegExp(`url\\(["']?([^"')]*${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']?\\)`, 'gi'),
    ]
    
    patterns.forEach(pattern => {
      finalHtml = finalHtml.replace(pattern, (match, path) => {
        return match.replace(path, file.url)
      })
    })
  })

  // Inject base tag for relative paths
  finalHtml = finalHtml.replace(
    '<head>',
    `<head><base href="${htmlFile.url.split('/').slice(0, -1).join('/')}/">`
  )

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: finalHtml }}
      className="w-full h-screen overflow-auto"
      style={{ 
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0,
        border: 'none'
      }}
    />
  )
}
