import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') // 'followers' or 'following'

  const supabase = await createClient()

  try {
    if (type === 'followers') {
      // Get users who follow this user
      const { data, error } = await supabase
        .from('allies')
        .select('follower_id, profiles!inner(id, display_name, username, avatar_url)')
        .eq('following_id', userId)

      if (error) throw error
      return NextResponse.json(data)
    } else if (type === 'following') {
      // Get users this user follows
      const { data, error } = await supabase
        .from('allies')
        .select('following_id, profiles!inner(id, display_name, username, avatar_url)')
        .eq('follower_id', userId)

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

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
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json({ error: 'Missing following_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('allies')
      .insert({
        follower_id: user.id,
        following_id,
      })
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
    const body = await req.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json({ error: 'Missing following_id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('allies')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
