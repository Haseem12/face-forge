import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Multiple RSS feeds for real-time news coverage
const RSS_FEEDS = [
  // Tech & AI focused
  'https://news.google.com/rss/search?q=technology+AI+programming+software+development&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=tech+startups+innovation+entrepreneurship&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=artificial+intelligence+machine+learning&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=web+development+design+coding&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=cybersecurity+privacy+data+protection&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=cloud+computing+devops&hl=en-US&gl=US&ceid=US:en',
  
  // Major tech news sources
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://feeds.feedburner.com/TechCrunch',
  'https://www.wired.com/feed/rss',
  'https://www.theverge.com/rss/index.xml',
  'https://arstechnica.com/feed/',
  'https://www.engadget.com/rss.xml',
  'https://www.zdnet.com/news/rss.xml',
  'https://www.cnet.com/rss/news/',
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/full.xml',
  'https://www.wired.com/category/tech/feed',
]

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

async function fetchRSSFeed(url: string, sourceName?: string): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsReader/2.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
      next: { revalidate: 60 } // Revalidate every minute
    })
    
    clearTimeout(timeoutId)

    if (!res.ok) return []
    const xml = await res.text()
    const articles: any[] = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 15) {
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
      // Clean title from source suffix
      const titleParts = rawTitle.split(' - ')
      const cleanTitle = titleParts.length > 1 
        ? titleParts.slice(0, -1).join(' - ') 
        : rawTitle
      
      // Determine source name
      let finalSourceName = sourceName || 'Tech News'
      if (sourceMatch) {
        finalSourceName = decodeEntities(sourceMatch[1].trim())
      } else if (titleParts.length > 1 && !sourceName) {
        finalSourceName = titleParts[titleParts.length - 1]
      } else if (url.includes('techcrunch')) {
        finalSourceName = 'TechCrunch'
      } else if (url.includes('wired')) {
        finalSourceName = 'Wired'
      } else if (url.includes('theverge')) {
        finalSourceName = 'The Verge'
      } else if (url.includes('nytimes')) {
        finalSourceName = 'NY Times'
      }

      const descRaw = descMatch?.[1] || ''
      const urlToImage = extractImageFromDescription(descRaw)
      const description = stripHtml(decodeEntities(descRaw)).slice(0, 300)

      const articleUrl = linkMatch[1].trim()
      const id = crypto.createHash('md5').update(articleUrl + Date.now()).digest('hex')

      let pubDate = new Date()
      if (pubDateMatch) {
        const parsed = new Date(pubDateMatch[1].trim())
        if (!isNaN(parsed.getTime())) pubDate = parsed
      }

      articles.push({
        id,
        title: cleanTitle,
        description,
        url: articleUrl,
        urlToImage: urlToImage || null,
        source: { name: finalSourceName },
        publishedAt: pubDate.toISOString(),
      })
    }
    return articles
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    return []
  }
}

// Shuffle array for variety
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const runtime = 'nodejs'
export const maxDuration = 30 // Extended timeout for multiple feeds

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const refresh = url.searchParams.get('refresh') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '100')
    
    // Fetch from multiple sources in parallel
    console.log('[News API] Fetching from', RSS_FEEDS.length, 'sources...')
    
    const feedPromises = RSS_FEEDS.map(feed => fetchRSSFeed(feed))
    const feedResults = await Promise.allSettled(feedPromises)
    
    // Collect all successful articles
    let allArticles: any[] = []
    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value)
      }
    }
    
    // Deduplicate by URL (keep the first occurrence)
    const uniqueArticles = new Map()
    for (const article of allArticles) {
      if (!uniqueArticles.has(article.url)) {
        uniqueArticles.set(article.url, article)
      }
    }
    
    // Sort by date (newest first)
    let articles = Array.from(uniqueArticles.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)
    
    // Shuffle if refresh requested (fresh feel)
    if (refresh && articles.length > 0) {
      articles = shuffleArray(articles)
    }
    
    const duration = Date.now() - startTime
    console.log(`[News API] Fetched ${articles.length} unique articles from ${RSS_FEEDS.length} sources in ${duration}ms`)
    
    return NextResponse.json(
      { 
        articles, 
        count: articles.length,
        sources: RSS_FEEDS.length,
        lastUpdated: new Date().toISOString(),
        duration: `${duration}ms`
      },
      {
        headers: {
          'Cache-Control': refresh 
            ? 'no-cache, no-store, must-revalidate, max-age=0'
            : 'public, s-maxage=120, stale-while-revalidate=300', // Cache 2 minutes
        },
      }
    )
  } catch (err: any) {
    console.error('[News API] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch news', articles: [] },
      { status: 500 }
    )
  }
}