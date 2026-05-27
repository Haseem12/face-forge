// app/api/videos/route.ts
import { NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Map categories to YouTube search queries
const CATEGORY_QUERIES: Record<string, string> = {
  technology: 'technology tech gadgets AI programming',
  health: 'health wellness mental health meditation',
  entertainment: 'entertainment movies tv shows viral videos',
  gaming: 'gaming video games gameplay esports',
  sports: 'sports highlights football basketball soccer',
  business: 'business entrepreneurship finance marketing',
  music: 'music new songs concerts music videos',
  lifestyle: 'lifestyle vlog travel food',
  science: 'science physics space discovery',
  fitness: 'fitness workout gym exercise',
  creators: 'content creator tips youtube growth',
  news: 'breaking news world news top stories',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const categoriesParam = searchParams.get('categories') || 'technology'
  const categories = categoriesParam.split(',')
  
  // Randomly select a category for variety
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)]
  const searchQuery = CATEGORY_QUERIES[selectedCategory] || 'viral videos'
  
  const maxResults = limit
  const startIndex = (page - 1) * limit
  
  try {
    // Fetch from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}&videoDuration=any&order=date`
    )
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Get additional stats for each video
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    )
    const statsData = await statsResponse.json()
    
    // Merge stats with search results
    const videosWithStats = data.items.map((item: any) => {
      const stats = statsData.items?.find((s: any) => s.id === item.id.videoId)
      return {
        ...item,
        statistics: stats?.statistics || { viewCount: '0', likeCount: '0' },
        contentDetails: stats?.contentDetails || { duration: 'PT0M0S' }
      }
    })
    
    return NextResponse.json({
      videos: videosWithStats,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
      category: selectedCategory
    })
  } catch (error) {
    console.error('YouTube API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos', videos: [] },
      { status: 500 }
    )
  }
}
