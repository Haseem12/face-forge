// app/api/forges/files/route.ts
import { createClient } from '@/lib/supabase/server'
import { getForgeRole } from '@/lib/server/get-forge-role'
import { canEditFiles } from '@/lib/forge-permissions'
import { NextResponse } from 'next/server'

// GET /api/forges/files?forge_id=...
// Any member (owner, contributor, or viewer) can read files.
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const forgeId = searchParams.get('forge_id')
  if (!forgeId) {
    return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  }

  const role = await getForgeRole(supabase, forgeId, user.id)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('forge_files')
    .select('*')
    .eq('forge_id', forgeId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ files: data || [] })
}

// POST /api/forges/files
// Add a new file. Owner or contributor only — viewers are read-only.
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { forge_id, file_name, file_type, content } = body

    if (!forge_id || !file_name) {
      return NextResponse.json({ error: 'Missing forge_id or file_name' }, { status: 400 })
    }

    const role = await getForgeRole(supabase, forge_id, user.id)
    if (!canEditFiles(role)) {
      return NextResponse.json(
        { error: role === 'viewer' ? 'Viewers cannot edit files' : 'Not authorized' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('forge_files')
      .insert({
        forge_id,
        file_name,
        file_type: file_type || 'text',
        content: content || '',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ file: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// PUT /api/forges/files
// Update a file's content. Owner or contributor only.
export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { file_id, content } = body

    if (!file_id) {
      return NextResponse.json({ error: 'Missing file_id' }, { status: 400 })
    }

    const { data: existingFile } = await supabase
      .from('forge_files')
      .select('forge_id')
      .eq('id', file_id)
      .maybeSingle()

    if (!existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const role = await getForgeRole(supabase, existingFile.forge_id, user.id)
    if (!canEditFiles(role)) {
      return NextResponse.json(
        { error: role === 'viewer' ? 'Viewers cannot edit files' : 'Not authorized' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('forge_files')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', file_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ file: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// DELETE /api/forges/files
// Remove a file. Owner or contributor only.
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { file_id } = body

    if (!file_id) {
      return NextResponse.json({ error: 'Missing file_id' }, { status: 400 })
    }

    const { data: existingFile } = await supabase
      .from('forge_files')
      .select('forge_id')
      .eq('id', file_id)
      .maybeSingle()

    if (!existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const role = await getForgeRole(supabase, existingFile.forge_id, user.id)
    if (!canEditFiles(role)) {
      return NextResponse.json(
        { error: role === 'viewer' ? 'Viewers cannot delete files' : 'Not authorized' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('forge_files').delete().eq('id', file_id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
