'use client'

import { getTemplateConfig } from '@/lib/forge-templates'

interface TemplateForgeViewerProps {
  forge: {
    id: string
    name: string
    template_type: string
    config: Record<string, any>
    description?: string
  }
}

export default function TemplateForgeViewer({ forge }: TemplateForgeViewerProps) {
  const config = forge.config || {}
  const templateConfig = getTemplateConfig(forge.template_type as any)

  const renderPortfolio = () => (
    <div className="p-8 max-w-4xl mx-auto">
      {config.title && <h1 className="text-4xl font-bold mb-2">{config.title}</h1>}
      {config.subtitle && <p className="text-xl text-muted-foreground mb-8">{config.subtitle}</p>}

      {config.items && config.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.items.map((item: any, idx: number) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No portfolio items yet. Edit this forge to add them.</p>
        </div>
      )}
    </div>
  )

  const renderBlog = () => (
    <div className="p-8 max-w-4xl mx-auto">
      {config.title && <h1 className="text-4xl font-bold mb-2">{config.title}</h1>}
      {config.description && <p className="text-lg text-muted-foreground mb-8">{config.description}</p>}

      {config.posts && config.posts.length > 0 ? (
        <div className="space-y-4">
          {config.posts.map((post: any, idx: number) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-1">{post.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{post.date}</p>
              <p className="text-sm">{post.excerpt}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No blog posts yet. Edit this forge to add them.</p>
        </div>
      )}
    </div>
  )

  const renderGallery = () => (
    <div className="p-8 max-w-4xl mx-auto">
      {config.title && <h1 className="text-4xl font-bold mb-8">{config.title}</h1>}

      {config.images && config.images.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.images.map((image: any, idx: number) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden bg-muted aspect-square">
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {image.url ? <img src={image.url} alt={image.title} className="w-full h-full object-cover" /> : '📷'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No images yet. Edit this forge to add them.</p>
        </div>
      )}
    </div>
  )

  const renderShop = () => (
    <div className="p-8 max-w-4xl mx-auto">
      {config.storeName && <h1 className="text-4xl font-bold mb-2">{config.storeName}</h1>}
      {config.currency && <p className="text-sm text-muted-foreground mb-8">Currency: {config.currency}</p>}

      {config.products && config.products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.products.map((product: any, idx: number) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
              <p className="font-bold">{config.currency} {product.price}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No products yet. Edit this forge to add them.</p>
        </div>
      )}
    </div>
  )

  const renderDonation = () => (
    <div className="p-8 max-w-2xl mx-auto text-center">
      {config.title && <h1 className="text-4xl font-bold mb-4">{config.title}</h1>}
      {config.message && <p className="text-lg text-muted-foreground mb-8 whitespace-pre-wrap">{config.message}</p>}

      {config.tiers && config.tiers.length > 0 ? (
        <div className="space-y-3">
          {config.tiers.map((tier: any, idx: number) => (
            <button
              key={idx}
              className="w-full p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition"
            >
              <span className="font-semibold">{tier.label}</span>
              <span className="text-muted-foreground ml-2">${tier.amount}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )

  const renderGame = () => (
    <div className="p-8 max-w-4xl mx-auto">
      {config.title && <h1 className="text-4xl font-bold mb-8">{config.title}</h1>}
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <p>Game type: {config.gameType}</p>
        <p className="text-sm mt-2">Game content goes here</p>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (forge.template_type) {
      case 'portfolio':
        return renderPortfolio()
      case 'blog':
        return renderBlog()
      case 'gallery':
        return renderGallery()
      case 'shop':
        return renderShop()
      case 'donation':
        return renderDonation()
      case 'game':
        return renderGame()
      default:
        return <div className="p-8">Unknown forge type</div>
    }
  }

  return <div className="w-full h-full overflow-auto bg-background">{renderContent()}</div>
}
