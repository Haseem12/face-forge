export type ForgeTemplate = 'portfolio' | 'blog' | 'gallery' | 'shop' | 'donation' | 'game' | 'custom'

export interface ForgeTemplateConfig {
  name: string
  description: string
  icon: string
  defaultConfig: Record<string, any>
  fields: {
    label: string
    key: string
    type: 'text' | 'textarea' | 'url' | 'number'
    placeholder?: string
  }[]
}

export const FORGE_TEMPLATES: Record<ForgeTemplate, ForgeTemplateConfig> = {
  portfolio: {
    name: 'Portfolio',
    description: 'Showcase your work and projects',
    icon: '🎨',
    defaultConfig: {
      title: 'My Portfolio',
      subtitle: 'Designer & Developer',
      items: [],
    },
    fields: [
      {
        label: 'Portfolio Title',
        key: 'title',
        type: 'text',
        placeholder: 'My Portfolio',
      },
      {
        label: 'Subtitle',
        key: 'subtitle',
        type: 'text',
        placeholder: 'Designer & Developer',
      },
    ],
  },

  blog: {
    name: 'Blog',
    description: 'Write and share articles',
    icon: '📝',
    defaultConfig: {
      title: 'My Blog',
      description: 'Thoughts and ideas',
      posts: [],
    },
    fields: [
      {
        label: 'Blog Title',
        key: 'title',
        type: 'text',
        placeholder: 'My Blog',
      },
      {
        label: 'Blog Description',
        key: 'description',
        type: 'textarea',
        placeholder: 'A brief description of your blog',
      },
    ],
  },

  gallery: {
    name: 'Gallery',
    description: 'Display images and artwork',
    icon: '🖼️',
    defaultConfig: {
      title: 'My Gallery',
      images: [],
    },
    fields: [
      {
        label: 'Gallery Title',
        key: 'title',
        type: 'text',
        placeholder: 'My Gallery',
      },
    ],
  },

  shop: {
    name: 'Shop',
    description: 'Sell products and services',
    icon: '🛍️',
    defaultConfig: {
      storeName: 'My Store',
      currency: 'USD',
      products: [],
    },
    fields: [
      {
        label: 'Store Name',
        key: 'storeName',
        type: 'text',
        placeholder: 'My Store',
      },
      {
        label: 'Currency',
        key: 'currency',
        type: 'text',
        placeholder: 'USD',
      },
    ],
  },

  donation: {
    name: 'Donation',
    description: 'Collect donations or tips',
    icon: '❤️',
    defaultConfig: {
      title: 'Support Me',
      message: 'Help support my work',
      tiers: [
        { amount: 5, label: 'Coffee' },
        { amount: 25, label: 'Meal' },
        { amount: 100, label: 'Project Support' },
      ],
    },
    fields: [
      {
        label: 'Title',
        key: 'title',
        type: 'text',
        placeholder: 'Support Me',
      },
      {
        label: 'Message',
        key: 'message',
        type: 'textarea',
        placeholder: 'Help support my work',
      },
    ],
  },

  game: {
    name: 'Game',
    description: 'Create mini-games',
    icon: '🎮',
    defaultConfig: {
      title: 'My Game',
      gameType: 'tic-tac-toe',
    },
    fields: [
      {
        label: 'Game Title',
        key: 'title',
        type: 'text',
        placeholder: 'My Game',
      },
    ],
  },

  custom: {
    name: 'Custom',
    description: 'Code your own forge',
    icon: '⚙️',
    defaultConfig: {
      customCode: '',
    },
    fields: [],
  },
}

export function getTemplateConfig(template: ForgeTemplate): ForgeTemplateConfig {
  return FORGE_TEMPLATES[template]
}

export function getTemplateIcon(template: ForgeTemplate): string {
  return FORGE_TEMPLATES[template].icon
}
