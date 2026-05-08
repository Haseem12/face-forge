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
      .from('forge_comments')
      .select(`
        *,
        profiles:user_id(id, username, avatar_url, display_name)
      `)
      .eq('forge_id', forgeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ comments: data || [] })
  } catch (error) {
    console.error('[v0] Forge comments GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { forge_id, content, parent_comment_id } = await request.json()

  if (!forge_id || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('forge_comments')
      .insert({
        forge_id,
        user_id: user.id,
        content,
        parent_comment_id: parent_comment_id || null,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ comment: data[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Forge comments POST error:', error)
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { comment_id } = await request.json()

  if (!comment_id) {
    return NextResponse.json({ error: 'Missing comment_id' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('forge_comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Forge comments DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
