import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ forgeId: string }> }
) {
  const supabase = await createClient()
  const { forgeId } = await params

  try {
    const { data: files, error } = await supabase
      .from('forge_files')
      .select('*')
      .eq('forge_id', forgeId)

    if (error) throw error
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 })
    }

    const htmlFile = files.find(f => f.file_type === 'html')
    if (!htmlFile) {
      return NextResponse.json({ error: 'No HTML file found' }, { status: 400 })
    }

    let html = htmlFile.content

    const cssFiles = files.filter(f => f.file_type === 'css')
    cssFiles.forEach(cssFile => {
      const styleTag = `<style>${cssFile.content}</style>`
      html = html.replace('</head>', `${styleTag}</head>`)
    })

    const jsFiles = files.filter(f => f.file_type === 'js')
    jsFiles.forEach(jsFile => {
      const scriptTag = `<script>${jsFile.content}</script>`
      html = html.replace('</body>', `${scriptTag}</body>`)
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (error) {
    console.error('[v0] Forge preview render error:', error)
    return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 })
  }
}
