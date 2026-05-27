// app/api/fleex/feed/route.ts
import { NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Map categories to YouTube search queries for Shorts
const CATEGORY_QUERIES: Record<string, string> = {
  'For You': '#shorts viral trending',
  'Technology': '#shorts technology tech gadgets',
  'Health': '#shorts health wellness fitness',
  'Entertainment': '#shorts entertainment movies',
  'Gaming': '#shorts gaming gameplay',
  'Sports': '#shorts sports highlights',
  'Business': '#shorts business tips',
  'Music': '#shorts music songs',
  'Lifestyle': '#shorts lifestyle vlog',
  'Fitness': '#shorts fitness workout gym',
  'Comedy': '#shorts comedy funny',
  'Education': '#shorts educational learning',
  'Travel': '#shorts travel destinations',
  'Food': '#shorts cooking recipe',
  'Art': '#shorts art painting',
  'Nature': '#shorts nature wildlife'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const category = searchParams.get('category') || 'For You'
  
  const searchQuery = CATEGORY_QUERIES[category] || '#shorts viral'
  const maxResults = limit
  const API_KEY = YOUTUBE_API_KEY
  
  // If no API key, return mock data
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    return NextResponse.json({
      fleex: getMockShorts(category, limit),
      hasMore: false
    })
  }
  
  try {
    // Fetch YouTube Shorts (videos with #shorts tag, short duration)
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=short&key=${API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({
        fleex: getMockShorts(category, limit),
        hasMore: false
      })
    }
    
    // Get video IDs for additional stats
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
    
    let statsData = { items: [] }
    try {
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${API_KEY}`
      )
      if (statsResponse.ok) {
        statsData = await statsResponse.json()
      }
    } catch (statsError) {
      console.error('Error fetching video stats:', statsError)
    }
    
    // Transform YouTube data to fleex format
    const fleexData = data.items.map((item: any, index: number) => {
      const stats = statsData.items?.find((s: any) => s.id === item.id.videoId)
      const duration = stats?.contentDetails?.duration || 'PT0M0S'
      const durationSeconds = parseDuration(duration)
      
      // Only include shorts (under 60 seconds)
      if (durationSeconds > 60) return null
      
      return {
        id: item.id.videoId,
        user_id: `youtube_${item.snippet.channelId}`,
        video_url: `https://www.youtube.com/embed/${item.id.videoId}`,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        caption: item.snippet.title,
        music_name: 'YouTube Shorts',
        view_count: parseInt(stats?.statistics?.viewCount || '0'),
        like_count: parseInt(stats?.statistics?.likeCount || '0'),
        comment_count: 0,
        share_count: 0,
        duration: durationSeconds,
        created_at: item.snippet.publishedAt,
        display_name: item.snippet.channelTitle,
        username: item.snippet.channelId,
        avatar_url: null,
        is_youtube: true,
        is_short: true
      }
    }).filter(Boolean) // Remove null entries
    
    return NextResponse.json({
      fleex: fleexData,
      hasMore: fleexData.length === maxResults
    })
  } catch (error) {
    console.error('YouTube API Error:', error)
    return NextResponse.json({
      fleex: getMockShorts(category, limit),
      hasMore: false
    })
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 30
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

function getMockShorts(category: string, count: number) {
  const shorts = []
  for (let i = 0; i < count; i++) {
    shorts.push({
      id: `mock_${i}`,
      user_id: `mock_user_${i}`,
      video_url: '',
      thumbnail_url: `https://picsum.photos/seed/shorts_${category}_${i}/400/700`,
      caption: `${category} Short ${i + 1} 🔥`,
      music_name: 'Trending Short',
      view_count: Math.floor(Math.random() * 1000000),
      like_count: Math.floor(Math.random() * 50000),
      comment_count: Math.floor(Math.random() * 1000),
      share_count: Math.floor(Math.random() * 500),
      duration: Math.floor(Math.random() * 30) + 15,
      created_at: new Date().toISOString(),
      display_name: `${category} Creator`,
      username: `creator_${i}`,
      avatar_url: null,
      is_youtube: false,
      is_short: true
    })
  }
  return shorts
}
