// app/api/news/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const GOOGLE_NEWS_RSS_BASE =
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

function extractRealUrl(googleUrl: string, rawXml: string, title: string): string {
  // Google News links are redirects – we keep the original link (opens fine)
  return googleUrl
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const bust = url.searchParams.get('bust')   // e.g. ?bust=timestamp

    // 1. Build RSS URL with optional cache buster
    let rssUrl = GOOGLE_NEWS_RSS_BASE
    if (bust) {
      // Append a random query param to bypass Google's CDN cache
      rssUrl += `&_cb=${Date.now()}&_rand=${Math.random()}`
    }

    // 2. Fetch RSS with appropriate cache settings
    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsReader/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    }

    if (bust) {
      // Force fresh fetch, no Next.js data cache
      fetchOptions.cache = 'no-store'
    } else {
      // Normal mode: cache for 5 minutes
      fetchOptions.next = { revalidate: 300 }
    }

    const res = await fetch(rssUrl, fetchOptions)

    if (!res.ok) {
      return NextResponse.json(
        { error: `RSS fetch failed: ${res.status}` },
        { status: 502 }
      )
    }

    const xml = await res.text()

    // Parse <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let articles: any[] = []
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

      const articleUrl = linkMatch[1].trim()
      const id = crypto.createHash('md5').update(articleUrl).digest('hex')

      articles.push({
        id,
        title: cleanTitle,
        description,
        url: articleUrl,
        urlToImage: urlToImage || null,
        source: { name: sourceName },
        publishedAt: pubDateMatch
          ? new Date(pubDateMatch[1].trim()).toISOString()
          : new Date().toISOString(),
      })
    }

    // 3. If bust is present, shuffle the articles to feel "new" even if RSS order is same
    if (bust && articles.length > 0) {
      articles = shuffleArray(articles)
    }

    // 4. Set response headers: force no caching when bust is used
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (bust) {
      responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    } else {
      responseHeaders['Cache-Control'] = 'public, s-maxage=900, stale-while-revalidate=1800'
    }

    return NextResponse.json(
      { articles, count: articles.length },
      { headers: responseHeaders }
    )
  } catch (err: any) {
    console.error('[/api/news] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch news' },
      { status: 500 }
    )
  }
}