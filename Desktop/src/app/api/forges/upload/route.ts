import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const forgeId = formData.get('forgeId') as string

    if (!file || !forgeId) {
      return NextResponse.json({ error: 'Missing file or forgeId' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip files are supported' }, { status: 400 })
    }

    // Use dynamic import for JSZip (more commonly available)
    let JSZip: any
    try {
      JSZip = (await import('unzipit')).default || (await import('jszip')).default
    } catch {
      // Fallback - try unzipit
      const { unzip } = await import('unzipit')
      const arrayBuffer = await file.arrayBuffer()
      const { entries } = await unzip(arrayBuffer)

      const files: { path: string; url: string }[] = []

      for (const [path, entry] of Object.entries(entries)) {
        if (path.startsWith('__MACOSX') || path.startsWith('.') || path.endsWith('/')) continue

        const content = await entry.arrayBuffer()
        const blob = new Blob([content])
        const cleanPath = path.replace(/^[^/]+\//, '')

        const storagePath = `forges/${forgeId}/${cleanPath}`
        const { error: uploadError } = await supabase.storage
          .from('forge-files')
          .upload(storagePath, blob, {
            contentType: 'application/octet-stream',
            upsert: true,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('forge-files')
            .getPublicUrl(storagePath)
          files.push({ path: cleanPath, url: publicUrl })
        }
      }

      // SAVE FILES TO FORGE CONFIG
      const { error: updateError } = await supabase
        .from('forges')
        .update({ config: { files } })
        .eq('id', forgeId)

      if (updateError) {
        console.error('Failed to update forge config:', updateError)
      }

      const indexFile = files.find((f: any) =>
        f.path === 'index.html' || f.path.endsWith('/index.html') || f.path === 'index.htm'
      )

      return NextResponse.json({
        success: true,
        files,
        entryPoint: indexFile?.path || null,
        previewUrl: `/preview/${forgeId}`,
      })
    }

    // If we got here, JSZip/unzipit wasn't available
    return NextResponse.json({ error: 'No ZIP library available' }, { status: 500 })

  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ error: 'Failed to extract and upload files' }, { status: 500 })
  }
}
