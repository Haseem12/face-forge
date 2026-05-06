import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const username = searchParams.get('username')

  const supabase = await createClient()

  try {
    if (username) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Missing userId or username' }, { status: 400 })
  } catch (error) {
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
    const { display_name, bio, avatar_url, cover_url } = body

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name,
        bio,
        avatar_url,
        cover_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
