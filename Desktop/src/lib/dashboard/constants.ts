export const TRENDING = [
  '#FacialAI',
  '#Deepfakes',
  '#StyleGAN',
  
]

export const FORGE_STYLES: Record<string, { from: string; to: string; icon: string }> = {
  default:    { from: 'from-orange-100', to: 'to-purple-100', icon: '🔧' },
  ai:         { from: 'from-blue-100',   to: 'to-indigo-100', icon: '🤖' },
  automation: { from: 'from-teal-100',   to: 'to-green-100',  icon: '⚡' },
  analytics:  { from: 'from-amber-100',  to: 'to-orange-100', icon: '📊' },
  social:     { from: 'from-pink-100',   to: 'to-rose-100',   icon: '💬' },
  facial:     { from: 'from-purple-100', to: 'to-pink-100',   icon: '👤' },
}

export function getForgeStyle(templateType: string) {
  const key = Object.keys(FORGE_STYLES).find(k =>
    templateType?.toLowerCase().includes(k)
  )
  return FORGE_STYLES[key || 'default']
}

export const BRAND_NAME = 'Faceforge'
export const BRAND_SUBTITLE = 'build your identity'