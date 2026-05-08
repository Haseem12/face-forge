import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const articleId = request.nextUrl.searchParams.get('article_id')

  if (!articleId) {
    return NextResponse.json({ error: 'Missing article_id' }, { status: 400 })
  }

  try {
    const [{ count: likeCount }, { data: currentUserLike }] = await Promise.all([
      supabase
        .from('news_likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId),
      (async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { data: null }
        return supabase
          .from('news_likes')
          .select('id')
          .eq('article_id', articleId)
          .eq('user_id', user.id)
          .maybeSingle()
      })(),
    ])

    return NextResponse.json({
      article_id: articleId,
      like_count: likeCount || 0,
      user_liked: !!currentUserLike,
    })
  } catch (error) {
    console.error('[v0] News likes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { article_id } = await request.json()

  if (!article_id) {
    return NextResponse.json({ error: 'Missing article_id' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('news_likes')
      .insert({ article_id, user_id: user.id })

    if (error) throw error

    return NextResponse.json({ success: true, article_id })
  } catch (error) {
    console.error('[v0] News likes POST error:', error)
    return NextResponse.json({ error: 'Failed to like article' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { article_id } = await request.json()

  if (!article_id) {
    return NextResponse.json({ error: 'Missing article_id' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('news_likes')
      .delete()
      .eq('article_id', article_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true, article_id })
  } catch (error) {
    console.error('[v0] News likes DELETE error:', error)
    return NextResponse.json({ error: 'Failed to unlike article' }, { status: 500 })
  }
}
