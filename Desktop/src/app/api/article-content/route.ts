import { NextResponse } from 'next/server'

// npm install cheerio
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const maxDuration = 15

// Ordered by specificity — most reliable selectors first
const CONTENT_SELECTORS = [
  'article[class*="article"]',
  'article[class*="post"]',
  'article[class*="story"]',
  'article',
  '[role="article"]',
  '[class*="article-body"]',
  '[class*="article__body"]',
  '[class*="post-content"]',
  '[class*="post__content"]',
  '[class*="entry-content"]',
  '[class*="story-body"]',
  '[class*="article-content"]',
  '[class*="content-body"]',
  'main',
]

const NOISE_SELECTORS = [
  'script', 'style', 'noscript',
  'nav', 'header', 'footer', 'aside',
  '[class*="ad-"]', '[class*="-ad"]', '[id*="ad-"]',
  '[class*="advertisement"]',
  '[class*="subscribe"]', '[class*="subscription"]',
  '[class*="newsletter"]', '[class*="popup"]',
  '[class*="cookie"]', '[class*="banner"]',
  '[class*="related"]', '[class*="recommended"]',
  '[class*="comment"]', '[class*="social"]',
  '[class*="share"]', '[class*="sidebar"]',
  'figure figcaption', // keep figures but drop captions to reduce noise
].join(', ')

function extractMetaContent($: cheerio.CheerioAPI, properties: string[]): string {
  for (const prop of properties) {
    const val =
      $(`meta[property="${prop}"]`).attr('content') ||
      $(`meta[name="${prop}"]`).attr('content')
    if (val?.trim()) return val.trim()
  }
  return ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Basic URL validation
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Mimic a real browser — many sites reject non-browser UAs
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Referer: 'https://www.google.com/', // helps bypass some paywalls
      },
      signal: AbortSignal.timeout(10_000),
      // Follow redirects (fetch does this by default, just being explicit)
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Source returned ${response.status}` },
        { status: 502 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // --- Extract metadata first (before stripping) ---
    const title =
      extractMetaContent($, ['og:title', 'twitter:title']) ||
      $('h1').first().text().trim() ||
      $('title').text().replace(/\s*[|\-–—].*$/, '').trim() // strip "| Site Name" suffix

    const image =
      extractMetaContent($, ['og:image', 'twitter:image']) ||
      $('article img').first().attr('src') ||
      ''

    const description =
      extractMetaContent($, ['og:description', 'twitter:description', 'description']) ||
      ''

    const author =
      extractMetaContent($, ['author', 'article:author']) ||
      $('[class*="author"] [class*="name"]').first().text().trim() ||
      $('[rel="author"]').first().text().trim() ||
      ''

    const publishedAt =
      extractMetaContent($, ['article:published_time', 'og:updated_time', 'date']) ||
      $('time[datetime]').first().attr('datetime') ||
      ''

    // --- Strip noise ---
    $(NOISE_SELECTORS).remove()

    // --- Extract main content ---
    let contentHtml = ''
    let contentText = ''

    for (const selector of CONTENT_SELECTORS) {
      const el = $(selector).first()
      const text = el.text().trim()
      // Require at least 300 chars to consider it real article content
      if (el.length && text.length > 300) {
        contentHtml = el.html() || ''
        contentText = text
        break
      }
    }

    // Fallback: collect all substantial paragraphs
    if (!contentText || contentText.length < 300) {
      const paragraphs: string[] = []
      $('p').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 60) paragraphs.push(text)
      })
      contentText = paragraphs.join('\n\n')
    }

    // Clean up whitespace artifacts from HTML stripping
    contentText = contentText
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!contentText) {
      return NextResponse.json(
        { 
          error: 'Could not extract content — site may require a subscription or block scraping',
          title,
          image,
          description,
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        title,
        content: contentText,
        image: image.startsWith('//') ? `https:${image}` : image, // fix protocol-relative URLs
        description,
        author,
        publishedAt,
      },
      {
        headers: {
          // Cache successful extractions for 1 hour — articles don't change
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error: any) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError'
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Failed to fetch content' },
      { status: isTimeout ? 504 : 500 }
    )
  }
}
