import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Find all expired stories
  const { data: expiredStories, error: selectError } = await supabase
    .from('stories')
    .select('id, media_url')
    .lt('expires_at', new Date().toISOString())

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), { status: 500 })
  }

  if (!expiredStories || expiredStories.length === 0) {
    return new Response(JSON.stringify({ message: 'No expired stories' }), { status: 200 })
  }

  // 2. Delete files from Storage
  const filePaths = expiredStories.map((story) => {
    // Extract the path after 'public/stories/' from the URL
    const url = new URL(story.media_url)
    const pathPrefix = '/storage/v1/object/public/stories/'
    const path = url.pathname.replace(pathPrefix, '')
    return path
  })

  if (filePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('stories')
      .remove(filePaths)

    if (removeError) {
      console.error('Failed to remove files:', removeError)
    }
  }

  // 3. Delete the rows
  const { error: deleteError } = await supabase
    .from('stories')
    .delete()
    .in('id', expiredStories.map((s) => s.id))

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ cleaned: expiredStories.length }), { status: 200 })
})