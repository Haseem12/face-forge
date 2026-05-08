import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const articleId = request.nextUrl.searchParams.get('article_id')

  if (!articleId) {
    return NextResponse.json({ error: 'Missing article_id' }, { status: 400 })
  }

  try {
    const { data: comments, error } = await supabase
      .from('news_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles(username, avatar_url, display_name)
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      article_id: articleId,
      comments: comments || [],
      count: comments?.length || 0,
    })
  } catch (error) {
    console.error('[v0] News comments GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { article_id, content } = await request.json()

  if (!article_id || !content) {
    return NextResponse.json({ error: 'Missing article_id or content' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: comment, error } = await supabase
      .from('news_comments')
      .insert({ article_id, user_id: user.id, content })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('[v0] News comments POST error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
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

    // Verify the comment belongs to the user
    const { data: comment } = await supabase
      .from('news_comments')
      .select('user_id')
      .eq('id', comment_id)
      .single()

    if (comment?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('news_comments')
      .delete()
      .eq('id', comment_id)

    if (error) throw error

    return NextResponse.json({ success: true, comment_id })
  } catch (error) {
    console.error('[v0] News comments DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
