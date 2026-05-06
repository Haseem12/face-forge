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
    const { name, template_type, description, config } = body

    if (!name || !template_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('forges')
      .insert({
        user_id: user.id,
        name,
        template_type,
        description,
        config: config || {},
        is_published: false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const forgeId = searchParams.get('id')

  const supabase = await createClient()

  try {
    if (forgeId) {
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

      return NextResponse.json(data[0])
    }

    return NextResponse.json({ error: 'Missing forgeId' }, { status: 400 })
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
    const { id, name, description, config, is_published, custom_code } = body

    const { data, error } = await supabase
      .from('forges')
      .update({
        name,
        description,
        config,
        is_published,
        custom_code,
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

    const { error } = await supabase.from('forges').delete().eq('id', id).eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
