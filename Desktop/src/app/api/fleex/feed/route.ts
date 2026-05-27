// app/api/fleex/feed/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const query = searchParams.get('q') || ''
  
  const supabase = createClient()
  const offset = (page - 1) * limit
  
  try {
    // Fetch fleex - you can modify this to use a video API or your own content
    // For now, fetch from user_fleex table
    let fleexQuery = supabase
      .from('user_fleex')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, error } = await fleexQuery
    
    if (error) throw error
    
    return NextResponse.json({
      fleex: data || [],
      hasMore: (data?.length || 0) === limit
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ fleex: [], hasMore: false }, { status: 500 })
  }
}
