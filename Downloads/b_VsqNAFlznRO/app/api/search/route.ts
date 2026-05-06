import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ profiles: [] })
  }

  const supabase = await createClient()

  try {
    // Search profiles by username or display_name
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${query}%, display_name.ilike.%${query}%`)
      .limit(20)

    if (error) {
      console.error('[v0] Search error:', error)
      throw error
    }

    return NextResponse.json({
      profiles: profiles || [],
      query,
    })
  } catch (error) {
    console.error('[v0] Search API error:', error)
    return NextResponse.json({ error: 'Search failed', profiles: [] }, { status: 500 })
  }
}
