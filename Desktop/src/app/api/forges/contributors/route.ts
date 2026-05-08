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
      .from('forge_contributors')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles:user_id(id, username, avatar_url, display_name)
      `)
      .eq('forge_id', forgeId)
      .order('joined_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ contributors: data || [] })
  } catch (error) {
    console.error('[v0] Forge contributors GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { forge_id, user_id, role, is_initial } = await request.json()

  if (!forge_id || !user_id || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] Adding contributor:', { forge_id, user_id, role, is_initial, auth_user: user.id })

    // Allow initial owner registration (when forge is first created)
    // Otherwise, check if current user is owner
    if (!is_initial) {
      const { data: owner, error: ownerError } = await supabase
        .from('forge_contributors')
        .select('role')
        .eq('forge_id', forge_id)
        .eq('user_id', user.id)
        .single()

      if (ownerError) {
        console.error('[v0] Error checking owner status:', ownerError)
      }

      if (!owner || owner.role !== 'owner') {
        return NextResponse.json({ error: 'Only owner can add contributors' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('forge_contributors')
      .insert({
        forge_id,
        user_id,
        role: role || 'contributor',
      })
      .select()

    if (error) {
      console.error('[v0] Forge contributors insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to add contributor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('[v0] Contributor added successfully:', data[0]?.id)
    return NextResponse.json({ contributor: data[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Forge contributors POST error:', error)
    return NextResponse.json({ 
      error: 'Failed to add contributor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { forge_id, user_id } = await request.json()

  if (!forge_id || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is owner
    const { data: owner } = await supabase
      .from('forge_contributors')
      .select('role')
      .eq('forge_id', forge_id)
      .eq('user_id', user.id)
      .single()

    if (!owner || owner.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can remove contributors' }, { status: 403 })
    }

    const { error } = await supabase
      .from('forge_contributors')
      .delete()
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Forge contributors DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove contributor' }, { status: 500 })
  }
}
