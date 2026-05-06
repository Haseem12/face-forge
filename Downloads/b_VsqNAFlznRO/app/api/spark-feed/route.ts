import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user's allies (following)
    const { data: alliesForges } = await supabase
      .from('allies')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = alliesForges?.map((a) => a.following_id) || []

    // Get user's recent interactions to understand interests
    const { data: userInteractions } = await supabase
      .from('interactions')
      .select('forge_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const interactedForgeIds = userInteractions?.map((i) => i.forge_id) || []

    // Get published forges from people the user follows (prioritized)
    const { data: forgesFromAllies } = await supabase
      .from('forges')
      .select('id, name, description, template_type, user_id, created_at, profiles!inner(display_name, username, avatar_url)')
      .in('user_id', followingIds.length > 0 ? followingIds : [user.id])
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit * 2)

    // Get recommended forges based on similar templates to user's interactions
    const { data: allForges } = await supabase
      .from('forges')
      .select('id, name, description, template_type, user_id, created_at, profiles!inner(display_name, username, avatar_url)')
      .eq('is_published', true)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit * 3)

    // Build recommendation score for each forge
    const forgeScores: { [key: string]: number } = {}
    
    if (allForges) {
      allForges.forEach((forge: any) => {
        let score = 0
        
        // Bonus for forges from allies
        if (followingIds.includes(forge.user_id)) {
          score += 10
        }
        
        // Bonus for forges matching user's interests (based on interaction history)
        const userInteractionTemplates = userInteractions
          ? Array.from(new Set(
              allForges
                .filter((f: any) => f.id === userInteractions.find((i) => i.forge_id === f.id)?.forge_id)
                .map((f: any) => f.template_type)
            ))
          : []

        if (userInteractionTemplates.includes(forge.template_type)) {
          score += 5
        }

        // Bonus for recently created
        const createdDaysAgo = Math.floor(
          (Date.now() - new Date(forge.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (createdDaysAgo < 7) score += 3
        if (createdDaysAgo < 1) score += 5

        forgeScores[forge.id] = score
      })
    }

    // Combine and sort by score
    const combinedForges = Array.from(
      new Map((allForges || []).map((f: any) => [f.id, f])).values()
    ).sort((a: any, b: any) => (forgeScores[b.id] || 0) - (forgeScores[a.id] || 0))

    return NextResponse.json({
      forges: combinedForges.slice(0, limit),
      total: combinedForges.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
