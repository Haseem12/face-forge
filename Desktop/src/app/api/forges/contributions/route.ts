import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const forgeId = request.nextUrl.searchParams.get('forge_id')
  const status = request.nextUrl.searchParams.get('status')

  if (!forgeId) {
    return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('forge_contributions')
      .select(`
        *,
        profiles:contributor_id(id, username, avatar_url, display_name),
        forge_files(file_name, file_type)
      `)
      .eq('forge_id', forgeId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ contributions: data || [] })
  } catch (error) {
    console.error('[v0] Forge contributions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { forge_id, file_id, new_content, description } = await request.json()

  if (!forge_id || !new_content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('forge_contributions')
      .insert({
        forge_id,
        contributor_id: user.id,
        file_id: file_id || null,
        new_content,
        description: description || null,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ contribution: data[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Forge contributions POST error:', error)
    return NextResponse.json({ error: 'Failed to submit contribution' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { contribution_id, status, forge_id } = await request.json()

  if (!contribution_id || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner
    const { data: owner } = await supabase
      .from('forge_contributors')
      .select('role')
      .eq('forge_id', forge_id)
      .eq('user_id', user.id)
      .single()

    if (!owner || owner.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can approve contributions' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('forge_contributions')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', contribution_id)
      .select()

    if (error) throw error

    // If approved, update the file content
    if (status === 'approved' && data[0].file_id) {
      const { error: updateError } = await supabase
        .from('forge_files')
        .update({ content: data[0].new_content, updated_at: new Date().toISOString() })
        .eq('id', data[0].file_id)

      if (updateError) throw updateError
    }

    return NextResponse.json({ contribution: data[0] })
  } catch (error) {
    console.error('[v0] Forge contributions PUT error:', error)
    return NextResponse.json({ error: 'Failed to update contribution' }, { status: 500 })
  }
}
