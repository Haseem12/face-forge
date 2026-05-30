// app/api/forges/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unzip } from 'unzipit'
import { v4 as uuidv4 } from 'uuid'

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

    // Extract ZIP
    const arrayBuffer = await file.arrayBuffer()
    const { entries } = await unzip(arrayBuffer)
    
    const files: { path: string; url: string }[] = []
    
    for (const [path, entry] of Object.entries(entries)) {
      if (path.startsWith('__MACOSX') || path.startsWith('.')) continue
      
      const content = await entry.arrayBuffer()
      const blob = new Blob([content])
      const cleanPath = path.replace(/^[^/]+\//, '') // Remove root folder
      
      // Upload to Supabase Storage
      const storagePath = `forges/${forgeId}/${cleanPath}`
      const { error: uploadError } = await supabase.storage
        .from('forge-files')
        .upload(storagePath, blob, { contentType: 'application/octet-stream', upsert: true })
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('forge-files')
          .getPublicUrl(storagePath)
        files.push({ path: cleanPath, url: publicUrl })
      }
    }

    // Update forge with file listing
    await supabase.from('forges').update({
      config: supabase.sql`jsonb_set(config, '{files}', ${JSON.stringify(files)}::jsonb)`,
      preview_url: `${process.env.NEXT_PUBLIC_SITE_URL}/preview/${forgeId}`
    }).eq('id', forgeId)

    // Find and set entry point
    const indexFile = files.find(f => 
      f.path === 'index.html' || f.path.endsWith('/index.html')
    )
    
    return NextResponse.json({ 
      success: true, 
      files,
      entryPoint: indexFile?.path || 'index.html',
      previewUrl: `/preview/${forgeId}`
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
