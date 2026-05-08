import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const forgeId = request.nextUrl.searchParams.get('forge_id')

  if (!forgeId) {
    return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('forge_files')
      .select('*')
      .eq('forge_id', forgeId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ files: data || [] })
  } catch (error) {
    console.error('[v0] Forge files GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { forge_id, file_name, file_type, content } = await request.json()

  if (!forge_id || !file_name || !file_type || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a contributor
    const { data: contributor } = await supabase
      .from('forge_contributors')
      .select('role')
      .eq('forge_id', forge_id)
      .eq('user_id', user.id)
      .single()

    if (!contributor) {
      return NextResponse.json({ error: 'Not a contributor' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('forge_files')
      .insert({
        forge_id,
        file_name,
        file_type,
        content,
        created_by: user.id,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ file: data[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Forge files POST error:', error)
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { file_id, content } = await request.json()

  if (!file_id || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('forge_files')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', file_id)
      .select()

    if (error) throw error
    if (!data?.[0]) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({ file: data[0] })
  } catch (error) {
    console.error('[v0] Forge files PUT error:', error)
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { file_id } = await request.json()

  if (!file_id) {
    return NextResponse.json({ error: 'Missing file_id' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('forge_files')
      .delete()
      .eq('id', file_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Forge files DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
