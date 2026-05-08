import Image from 'next/image'

interface AvatarCircleProps {
  src?: string | null
  name?: string
  size?: number
}

export default function AvatarCircle({ src, name, size = 40 }: AvatarCircleProps) {
  const fontSize = Math.max(10, size * 0.38)
  if (src) {
    return (
      <div
        className="relative rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={name || ''} fill className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold select-none"
      style={{
        width: size,
        height: size,
        fontSize,
        background: 'linear-gradient(135deg, #f97316, #9333ea)',
      }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}