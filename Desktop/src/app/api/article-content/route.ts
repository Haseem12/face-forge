import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Use a free CORS proxy or your own backend
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
    const html = await response.text()
    
    // Simple content extraction (you can enhance this)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
    const contentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                        html.match(/<div[^>]*content[^>]*>([\s\S]*?)<\/div>/i)
    
    return NextResponse.json({
      title: titleMatch?.[1] || '',
      content: contentMatch?.[1] || 'Content could not be extracted.'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}