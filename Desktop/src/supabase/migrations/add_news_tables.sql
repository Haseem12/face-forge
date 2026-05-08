-- Create news_likes table
CREATE TABLE news_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Create news_comments table
CREATE TABLE news_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_news_likes_article ON news_likes(article_id);
CREATE INDEX idx_news_likes_user ON news_likes(user_id);
CREATE INDEX idx_news_comments_article ON news_comments(article_id);
CREATE INDEX idx_news_comments_user ON news_comments(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE news_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_likes
CREATE POLICY "Anyone can view news likes"
  ON news_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like news articles"
  ON news_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own likes"
  ON news_likes FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for news_comments
CREATE POLICY "Anyone can view news comments"
  ON news_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can comment on news"
  ON news_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON news_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON news_comments FOR UPDATE
  USING (user_id = auth.uid());
