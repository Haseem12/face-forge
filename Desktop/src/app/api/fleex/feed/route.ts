// app/api/fleex/feed/route.ts
import { NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Map categories to YouTube search queries
const CATEGORY_QUERIES: Record<string, string> = {
  'For You': 'viral trending popular',
  'Technology': 'technology tech gadgets',
  'Health & Wellness': 'health wellness fitness',
  'Entertainment': 'entertainment movies viral',
  'Gaming': 'gaming gameplay esports',
  'Sports': 'sports highlights football',
  'Business': 'business entrepreneurship',
  'Music': 'music songs viral',
  'Lifestyle': 'lifestyle vlog travel',
  'Fitness': 'fitness workout gym',
  'Comedy': 'comedy funny viral',
  'Education': 'educational tutorials',
  'Travel': 'travel vlog destinations',
  'Food': 'cooking food recipes',
  'Art': 'art painting creative',
  'Nature': 'nature wildlife scenery'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const category = searchParams.get('category') || 'For You'
  
  const searchQuery = CATEGORY_QUERIES[category] || 'viral videos'
  const maxResults = limit
  const API_KEY = YOUTUBE_API_KEY
  
  // If no API key, return mock data
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    return NextResponse.json({
      fleex: getMockFleex(category, limit),
      hasMore: false
    })
  }
  
  try {
    // Fetch from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}&videoDuration=short`
    )
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({
        fleex: getMockFleex(category, limit),
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
      
      return {
        id: item.id.videoId,
        user_id: `youtube_${item.snippet.channelId}`,
        video_url: `https://www.youtube.com/embed/${item.id.videoId}`,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        caption: item.snippet.title,
        music_name: 'YouTube',
        view_count: parseInt(stats?.statistics?.viewCount || '0'),
        like_count: parseInt(stats?.statistics?.likeCount || '0'),
        comment_count: 0,
        share_count: 0,
        duration: parseDuration(duration),
        created_at: item.snippet.publishedAt,
        display_name: item.snippet.channelTitle,
        username: item.snippet.channelId,
        avatar_url: null,
        is_youtube: true
      }
    })
    
    return NextResponse.json({
      fleex: fleexData,
      hasMore: fleexData.length === maxResults
    })
  } catch (error) {
    console.error('YouTube API Error:', error)
    return NextResponse.json({
      fleex: getMockFleex(category, limit),
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

function getMockFleex(category: string, count: number) {
  const videos = []
  for (let i = 0; i < count; i++) {
    videos.push({
      id: `mock_${i}`,
      user_id: `mock_user_${i}`,
      video_url: '',
      thumbnail_url: `https://picsum.photos/seed/${category}_${i}/400/700`,
      caption: `Amazing ${category} video ${i + 1}`,
      music_name: 'Trending Sound',
      view_count: Math.floor(Math.random() * 1000000),
      like_count: Math.floor(Math.random() * 50000),
      comment_count: Math.floor(Math.random() * 1000),
      share_count: Math.floor(Math.random() * 500),
      duration: 30,
      created_at: new Date().toISOString(),
      display_name: `${category} Creator`,
      username: `creator_${i}`,
      avatar_url: null,
      is_youtube: false
    })
  }
  return videos
}
