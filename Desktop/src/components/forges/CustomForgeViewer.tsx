'use client'

import { useEffect, useRef } from 'react'

interface CustomForgeViewerProps {
  customCode: string
  forgeId: string
}

export default function CustomForgeViewer({ customCode, forgeId }: CustomForgeViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current || !customCode) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document

    if (!doc) return

    // Create HTML structure with sandboxed environment
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        </style>
      </head>
      <body>
        <div id="app"></div>
        <script>
          try {
            ${customCode}
          } catch (error) {
            console.error('Error in custom forge:', error);
            document.body.innerHTML = '<p style="color: red; padding: 20px;">Error loading forge: ' + error.message + '</p>';
          }
        </script>
      </body>
      </html>
    `

    doc.open()
    doc.write(html)
    doc.close()
  }, [customCode])

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`Forge ${forgeId}`}
      />
    </div>
  )
}
