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
    const { forge_id, interaction_type } = body

    if (!forge_id || !interaction_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert interaction
    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      forge_id,
      interaction_type,
    })

    if (error) throw error

    // Update spark feed based on interaction
    await updateSparkFeed(supabase, user.id, forge_id, interaction_type)

    return NextResponse.json({ success: true })
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
    const { forge_id, interaction_type = 'like' } = body

    if (!forge_id) {
      return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
    }

    // Delete interaction
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', user.id)
      .eq('forge_id', forge_id)
      .eq('interaction_type', interaction_type)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Delete interaction error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

async function updateSparkFeed(supabase: any, userId: string, forgeId: string, interactionType: string) {
  // Score different interactions
  const scores: Record<string, number> = {
    view: 1,
    like: 3,
    share: 5,
    comment: 2,
  }

  const score = scores[interactionType] || 1

  // Check if already in feed
  const { data: existing } = await supabase
    .from('spark_feed')
    .select('*')
    .eq('user_id', userId)
    .eq('forge_id', forgeId)

  const existingRecord = existing?.[0]

  if (existingRecord) {
    // Update relevance score
    await supabase
      .from('spark_feed')
      .update({
        relevance_score: Math.min(existingRecord.relevance_score + score * 0.1, 1.0),
      })
      .eq('id', existingRecord.id)
  } else {
    // Add to feed
    await supabase.from('spark_feed').insert({
      user_id: userId,
      forge_id: forgeId,
      relevance_score: Math.min(score * 0.1, 1.0),
    })
  }
}
