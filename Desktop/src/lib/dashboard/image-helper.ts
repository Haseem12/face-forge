/**
 * NEWS IMAGE HELPER - Generates relevant images for news articles
 * 
 * HOW IT WORKS:
 * 1. If article has urlToImage/media_url → use it
 * 2. If not → search Unsplash API using article title as keywords
 * 3. If Unsplash fails or no API key → use fallback gradient image
 * 
 * SETUP REQUIRED:
 * Add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to your .env.local
 * Get FREE key at: https://unsplash.com/oauth/applications
 * It's FREE and no credit card needed!
 */

// Cache to avoid repeated API calls for same article
const imageCache = new Map<string, string>()

/**
 * Get a relevant image for a news article
 * Priority: Original URL → Unsplash search → Fallback gradient
 */
export async function getArticleImage(
  title: string,
  originalImageUrl?: string | null
): Promise<string> {
  // 1. Use original image if available
  if (originalImageUrl) {
    return originalImageUrl
  }

  // 2. Check cache
  if (imageCache.has(title)) {
    return imageCache.get(title)!
  }

  // 3. Try Unsplash API for relevant image
  const unsplashImage = await fetchUnsplashImage(title)
  if (unsplashImage) {
    imageCache.set(title, unsplashImage)
    return unsplashImage
  }

  // 4. Generate fallback gradient image (no external API needed)
  const fallbackImage = generateGradientImage(title)
  imageCache.set(title, fallbackImage)
  return fallbackImage
}

/**
 * Fetch relevant image from Unsplash using article title
 */
async function fetchUnsplashImage(title: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

  if (!apiKey) {
    console.log('[v0] Unsplash API key not configured - using fallback images')
    return null
  }

  try {
    // Extract keywords from title (first 3 words)
    const keywords = title
      .split(' ')
      .slice(0, 3)
      .join(' ')
      .toLowerCase()

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&count=1&client_id=${apiKey}`,
      { next: { revalidate: 3600 } } // cache 1 hour
    )

    if (!response.ok) {
      console.warn('[v0] Unsplash API error:', response.status)
      return null
    }

    const data = await response.json()
    const photo = data.results?.[0]

    if (!photo) {
      return null
    }

    // Return optimized image URL with width/height params for better performance
    return `${photo.urls.regular}?w=800&q=80`
  } catch (error) {
    console.warn('[v0] Failed to fetch from Unsplash:', error)
    return null
  }
}

/**
 * Generate a gradient image (no API needed, works offline)
 * Creates unique colors based on title hash for visual variety
 */
function generateGradientImage(title: string): string {
  // Generate hash from title for consistent colors
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Create consistent color palette from hash
  const hue1 = (hash % 360) * 1.0
  const hue2 = ((hash + 60) % 360) * 1.0
  const saturation = 70 + (hash % 20)
  const lightness = 55 + (hash % 15)

  // Generate SVG gradient image
  const svg = `
    <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1},${saturation}%,${lightness}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue2},${saturation}%,${lightness - 10}%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad)"/>
      <text x="50%" y="50%" font-size="36" font-weight="bold" fill="white" 
            text-anchor="middle" dominant-baseline="middle" opacity="0.8">
        News Article
      </text>
    </svg>
  `

  // Convert SVG to data URL
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml,${encoded}`
}

/**
 * Preload image to prevent layout shift
 */
export function preloadImage(src: string): void {
  if (typeof document === 'undefined') return // Server-side check

  if (src.startsWith('data:')) {
    // Data URLs don't need preloading
    return
  }

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)
}
