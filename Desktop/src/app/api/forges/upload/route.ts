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

    // Get existing forge config
    const { data: existingForge } = await supabase
      .from('forges')
      .select('config')
      .eq('id', forgeId)
      .single()

    // Try unzipit first
    const arrayBuffer = await file.arrayBuffer()
    
    let files: { path: string; url: string }[] = []

    try {
      const { unzip } = await import('unzipit')
      const { entries } = await unzip(arrayBuffer)

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
    } catch (e) {
      console.error('unzipit failed, trying manual extraction:', e)
      
      // Fallback: read the file listing from storage if unzip fails
      const { data: storageFiles } = await supabase.storage
        .from('forge-files')
        .list(`forges/${forgeId}`)
      
      if (storageFiles) {
        files = storageFiles
          .filter(f => !f.name.startsWith('.') && f.name !== '')
          .map(f => {
            const { data: { publicUrl } } = supabase.storage
              .from('forge-files')
              .getPublicUrl(`forges/${forgeId}/${f.name}`)
            return { path: f.name, url: publicUrl }
          })
      }
    }

    // MERGE files into existing config
    const existingConfig = existingForge?.config || {}
    const updatedConfig = { ...existingConfig, files }

    // Save merged config back to forge
    const { error: updateError } = await supabase
      .from('forges')
      .update({ config: updatedConfig })
      .eq('id', forgeId)

    if (updateError) {
      console.error('Failed to update forge config:', updateError)
      return NextResponse.json({ error: 'Failed to save files to forge' }, { status: 500 })
    }

    const indexFile = files.find((f: any) =>
      f.path === 'index.html' ||
      f.path.endsWith('/index.html') ||
      f.path === 'index.htm'
    )

    return NextResponse.json({
      success: true,
      files,
      entryPoint: indexFile?.path || null,
      previewUrl: `/preview/${forgeId}`,
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ error: 'Failed to extract and upload files' }, { status: 500 })
  }
}
