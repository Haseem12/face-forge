import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    const { 
      name, 
      template_type, 
      description, 
      config,
      is_collaborative,
      is_public_preview,
      preview_token,
    } = body

    if (!name || !template_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('forges')
      .insert({
        user_id: user.id,
        name,
        template_type,
        description: description || null,
        config: config || {},
        is_published: false,
        is_collaborative: is_collaborative || false,
        is_public_preview: is_public_preview || false,
        preview_token: preview_token || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error creating forge:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const forgeId = searchParams.get('id')

  if (!forgeId) {
    return NextResponse.json({ error: 'Missing forgeId' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('forges')
      .select('*')
      .eq('id', forgeId)

    if (error) {
      console.error('[v0] Forge query error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('[v0] Forge not found:', forgeId)
      return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
    }

    const forge = data[0]

    // Public/published forges are visible to anyone (this is what powers
    // the public preview link). Everything else requires the requester to
    // be the owner, or a contributor on a collaborative forge.
    const isPubliclyVisible = forge.is_public_preview || forge.is_published

    if (!isPubliclyVisible) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
      }

      const isOwner = forge.user_id === user.id

      let isContributor = false
      if (!isOwner && forge.is_collaborative) {
        const { data: contributorRow } = await supabase
          .from('forge_contributors')
          .select('id')
          .eq('forge_id', forgeId)
          .eq('user_id', user.id)
          .maybeSingle()
        isContributor = !!contributorRow
      }

      if (!isOwner && !isContributor) {
        // Return 404 rather than 403 so we don't confirm to strangers
        // that a private forge with this ID exists.
        return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
      }
    }

    return NextResponse.json(forge)
  } catch (error) {
    console.error('[v0] Error in GET /api/forges:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

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
    const { id, name, description, config, is_published, is_public_preview, custom_code } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing forge id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('forges')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
        ...(is_published !== undefined && { is_published }),
        ...(is_public_preview !== undefined && { is_public_preview }),
        ...(custom_code && { custom_code }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing forge id' }, { status: 400 })
    }

    const { error, count } = await supabase
      .from('forges')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    if (!count) {
      // Either the forge doesn't exist, or it belongs to someone else —
      // don't report success for a delete that didn't actually happen.
      return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
