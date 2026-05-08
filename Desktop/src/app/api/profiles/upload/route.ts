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
    const { type, data, fileName } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // For now, store the data URL directly in the database
    // In production, you would upload to a service like Cloudinary or AWS S3
    const column = type === 'avatar' ? 'avatar_url' : 'cover_url'

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        [column]: data, // Store base64 data URL directly
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({
      url: data,
      success: true,
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
