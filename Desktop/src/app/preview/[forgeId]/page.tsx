// app/preview/[forgeId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function PreviewPage({ params }: { params: { forgeId: string } }) {
  const supabase = await createClient()
  
  const { data: forge } = await supabase
    .from('forges')
    .select('config, preview_url')
    .eq('id', params.forgeId)
    .single()

  if (!forge) return notFound()

  const files = forge.config?.files || []
  const htmlFile = files.find((f: any) => f.path.endsWith('.html'))
  
  if (!htmlFile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No preview available</p>
        </div>
      </div>
    )
  }

  // Fetch and inject HTML
  const response = await fetch(htmlFile.url)
  let html = await response.text()
  
  // Replace asset paths
  files.forEach((file: any) => {
    const relativePath = file.path
    html = html.replace(
      new RegExp(`(['"])\\.?\\/?${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g'),
      `$1${file.url}$2`
    )
    html = html.replace(
      new RegExp(`(['"])${relativePath}(['"])`, 'g'),
      `$1${file.url}$2`
    )
  })

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: html }}
      className="w-full h-screen"
    />
  )
}
