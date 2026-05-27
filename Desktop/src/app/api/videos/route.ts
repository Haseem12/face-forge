// app/api/videos/route.ts
import { NextResponse } from 'next/server'

// Category to search query mapping
const CATEGORY_QUERIES: Record<string, string> = {
  technology: 'technology tech gadgets AI programming',
  health: 'health wellness mental health fitness',
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
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const categoriesParam = searchParams.get('categories') || 'technology'
    const categories = categoriesParam.split(',')
    
    // Randomly select a category for variety
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)]
    const searchQuery = CATEGORY_QUERIES[selectedCategory] || 'viral videos'
    
    const maxResults = limit
    const API_KEY = process.env.YOUTUBE_API_KEY
    
    // Check if API key is configured
    if (!API_KEY || API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
      console.error('YouTube API key is not configured')
      // Return mock data instead of failing
      return NextResponse.json({
        videos: getMockVideos(categories),
        hasMore: false,
        category: selectedCategory
      })
    }
    
    // Fetch from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}&videoDuration=any&order=date`
    )
    
    if (!response.ok) {
      console.error(`YouTube API error: ${response.status}`)
      // Return mock data on error
      return NextResponse.json({
        videos: getMockVideos(categories),
        hasMore: false,
        category: selectedCategory
      })
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({
        videos: getMockVideos(categories),
        hasMore: false,
        category: selectedCategory
      })
    }
    
    // Get video IDs for stats
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
    
    // Merge stats with search results
    const videosWithStats = data.items.map((item: any) => {
      const stats = statsData.items?.find((s: any) => s.id === item.id.videoId)
      return {
        id: item.id.videoId,
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        viewCount: stats?.statistics?.viewCount || '0',
        likeCount: stats?.statistics?.likeCount || '0',
        duration: stats?.contentDetails?.duration || 'PT0M0S',
        publishedAt: item.snippet.publishedAt,
        category: selectedCategory
      }
    })
    
    return NextResponse.json({
      videos: videosWithStats,
      hasMore: videosWithStats.length === maxResults,
      category: selectedCategory
    })
    
  } catch (error) {
    console.error('YouTube API Error:', error)
    // Return mock data on any error
    const categories = new URL(request.url).searchParams.get('categories')?.split(',') || ['technology']
    return NextResponse.json({
      videos: getMockVideos(categories),
      hasMore: false,
      category: categories[0]
    })
  }
}

// Mock videos for fallback when API fails
function getMockVideos(categories: string[]): any[] {
  const mockTitles = [
    "Amazing Technology Innovations 2024",
    "10 Minute Full Body Workout",
    "Latest Movie Trailer",
    "Top Gaming Moments",
    "Business Success Stories",
    "New Music Release",
    "Health & Wellness Tips",
    "Creator Economy Explained"
  ]
  
  const mockChannels = [
    "Tech Today", "Fitness Pro", "Entertainment Weekly", 
    "Gaming Central", "Business Insider", "Music World",
    "Health Hub", "Creator Academy"
  ]
  
  const videos = []
  for (let i = 0; i < 12; i++) {
    const category = categories[i % categories.length] || 'technology'
    videos.push({
      id: `mock-${i}`,
      videoId: `mock-${i}`,
      title: mockTitles[i % mockTitles.length],
      description: `This is a mock video about ${category}`,
      thumbnail: `https://picsum.photos/seed/${i}/400/225`,
      channelTitle: mockChannels[i % mockChannels.length],
      channelId: `channel-${i}`,
      viewCount: `${Math.floor(Math.random() * 1000000)}`,
      likeCount: `${Math.floor(Math.random() * 50000)}`,
      duration: `PT${Math.floor(Math.random() * 10) + 1}M`,
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: category
    })
  }
  return videos
}
