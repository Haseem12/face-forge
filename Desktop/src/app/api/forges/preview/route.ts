import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const forgeId = request.nextUrl.searchParams.get('forge_id')

  if (!forgeId) {
    return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  }

  try {
    // Get all forge files
    const { data: files, error: filesError } = await supabase
      .from('forge_files')
      .select('*')
      .eq('forge_id', forgeId)
      .order('created_at', { ascending: true })

    if (filesError) throw filesError

    // Group files by type
    const filesByType: Record<string, any[]> = {}
    files?.forEach(file => {
      if (!filesByType[file.file_type]) {
        filesByType[file.file_type] = []
      }
      filesByType[file.file_type].push(file)
    })

    return NextResponse.json({
      forge_id: forgeId,
      files,
      filesByType,
      preview_url: `/api/forges/preview/${forgeId}`,
    })
  } catch (error) {
    console.error('[v0] Forge preview GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch preview data' }, { status: 500 })
  }
}
