export interface ForgeFeed {
  id: string
  name: string
  description?: string
  template_type: string
  user_id: string
  created_at: string
  is_published: boolean
  profiles: { id: string; display_name: string; username: string; avatar_url?: string }[]
}

export interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  urlToImage?: string | null
  source: { name: string }
  publishedAt: string
}

export interface Comment {
  id: string
  article_id?: string
  forge_id?: string
  user_id: string
  content: string
  created_at: string
  parent_id?: string | null
  like_count?: number
  profiles?: { display_name: string; username: string; avatar_url?: string }
  replies?: Comment[]
  liked_by_user?: boolean
}