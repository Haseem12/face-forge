// app/api/news/route.ts
// Parses Google News RSS — no API key required
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const GOOGLE_NEWS_RSS =
  'https://news.google.com/rss/search?q=technology+AI+programming&hl=en-US&gl=US&ceid=US:en'

function extractImageFromDescription(html: string): string | undefined {
  const match = html.match(/<img[^>]+src="([^">]+)"/)
  return match?.[1]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Google News links are redirects — extract the real article URL from the RSS item
function extractRealUrl(googleUrl: string, rawXml: string, title: string): string {
  // Try to find the source URL in the description block matching this item
  // Fall back to the Google redirect URL itself (opens fine in browser)
  return googleUrl
}

export async function GET() {
  try {
    const res = await fetch(GOOGLE_NEWS_RSS, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NewsReader/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 900 }, // cache 15 min
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `RSS fetch failed: ${res.status}` },
        { status: 502 }
      )
    }

    const xml = await res.text()

    // Parse <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    const articles: any[] = []
    let match

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 20) {
      const item = match[1]

      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
        item.match(/<title>([\s\S]*?)<\/title>/)
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/) ||
        item.match(/<link\s+href="([^"]+)"/)
      const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        item.match(/<description>([\s\S]*?)<\/description>/)
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
      const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)

      if (!titleMatch || !linkMatch) continue

      const rawTitle = decodeEntities(titleMatch[1].trim())
      // Google News titles include " - Source Name" — strip it
      const titleParts = rawTitle.split(' - ')
      const sourceName =
        sourceMatch ? decodeEntities(sourceMatch[1].trim()) :
        titleParts.length > 1 ? titleParts[titleParts.length - 1] : 'Google News'
      const cleanTitle = titleParts.length > 1
        ? titleParts.slice(0, -1).join(' - ')
        : rawTitle

      const descRaw = descMatch?.[1] || ''
      const urlToImage = extractImageFromDescription(descRaw)
      const description = stripHtml(decodeEntities(descRaw)).slice(0, 200)

      const url = linkMatch[1].trim()
      // Stable ID from URL
      const id = crypto.createHash('md5').update(url).digest('hex')

      articles.push({
        id,
        title: cleanTitle,
        description,
        url,
        urlToImage: urlToImage || null,
        source: { name: sourceName },
        publishedAt: pubDateMatch
          ? new Date(pubDateMatch[1].trim()).toISOString()
          : new Date().toISOString(),
      })
    }

    return NextResponse.json(
      { articles, count: articles.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      }
    )
  } catch (err: any) {
    console.error('[/api/news] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch news' },
      { status: 500 }
    )
  }
}