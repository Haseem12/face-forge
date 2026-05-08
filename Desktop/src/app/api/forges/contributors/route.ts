import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/forge-contributors?forge_id=xxx
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const forgeId = request.nextUrl.searchParams.get('forge_id')

  if (!forgeId) {
    return NextResponse.json(
      { error: 'Missing forge_id' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('forge_contributors')
      .select(`
        id,
        forge_id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('forge_id', forgeId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('[Forge Contributors GET] Query Error:', error)

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      contributors: data || [],
    })
  } catch (error) {
    console.error('[Forge Contributors GET] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch contributors',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/forge-contributors
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const {
      forge_id,
      user_id,
      role = 'contributor',
      is_initial = false,
    } = body

    if (!forge_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Forge Contributors POST] Request:', {
      forge_id,
      user_id,
      role,
      is_initial,
      auth_user: user.id,
    })

    /**
     * Only owner can add contributors
     * unless this is initial forge creation
     */
    if (!is_initial) {
      const { data: owner, error: ownerError } = await supabase
        .from('forge_contributors')
        .select('role')
        .eq('forge_id', forge_id)
        .eq('user_id', user.id)
        .single()

      if (ownerError) {
        console.error(
          '[Forge Contributors POST] Owner Check Error:',
          ownerError
        )

        return NextResponse.json(
          {
            error: 'Failed to verify ownership',
            details: ownerError.message,
          },
          { status: 500 }
        )
      }

      if (!owner || owner.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only owner can add contributors' },
          { status: 403 }
        )
      }
    }

    /**
     * Prevent duplicate contributor
     */
    const { data: existingContributor } = await supabase
      .from('forge_contributors')
      .select('id')
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingContributor) {
      return NextResponse.json(
        { error: 'User is already a contributor' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('forge_contributors')
      .insert({
        forge_id,
        user_id,
        role,
      })
      .select(`
        id,
        forge_id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .single()

    if (error) {
      console.error(
        '[Forge Contributors POST] Insert Error:',
        error
      )

      return NextResponse.json(
        {
          error: 'Failed to add contributor',
          details: error.message,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    console.log(
      '[Forge Contributors POST] Contributor added:',
      data.id
    )

    return NextResponse.json(
      {
        contributor: data,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Forge Contributors POST] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to add contributor',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forge-contributors
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const { forge_id, user_id } = body

    if (!forge_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    /**
     * Verify owner permissions
     */
    const { data: owner, error: ownerError } = await supabase
      .from('forge_contributors')
      .select('role')
      .eq('forge_id', forge_id)
      .eq('user_id', user.id)
      .single()

    if (ownerError) {
      console.error(
        '[Forge Contributors DELETE] Owner Check Error:',
        ownerError
      )

      return NextResponse.json(
        {
          error: 'Failed to verify ownership',
          details: ownerError.message,
        },
        { status: 500 }
      )
    }

    if (!owner || owner.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can remove contributors' },
        { status: 403 }
      )
    }

    /**
     * Prevent owner removal
     */
    const { data: targetContributor } = await supabase
      .from('forge_contributors')
      .select('role')
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)
      .single()

    if (targetContributor?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove forge owner' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('forge_contributors')
      .delete()
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)

    if (error) {
      console.error(
        '[Forge Contributors DELETE] Delete Error:',
        error
      )

      return NextResponse.json(
        {
          error: 'Failed to remove contributor',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[Forge Contributors DELETE] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to remove contributor',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}