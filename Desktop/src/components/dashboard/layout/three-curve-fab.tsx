'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, Users, MessageCircle, PenTool, Image as ImageIcon } from 'lucide-react'

interface Action {
  href: string
  icon: React.ReactNode
  label: string
  gradient: string
}

// All actions displayed directly (no sub-menu)
const actions: Action[] = [
  {
    href: '/dashboard/forges/create',
    icon: <Sparkles className="h-5 w-5" />,
    label: 'Forge',
    gradient: 'from-pink-500 to-orange-500',
  },
  {
    href: '/dashboard/feeds/create',
    icon: <PenTool className="h-5 w-5" />,
    label: 'Feed',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    href: '/activity',
    icon: <Users className="h-5 w-5" />,
    label: 'Activity',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/messages',
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'Chat',
    gradient: 'from-purple-500 to-indigo-500',
  },
]

export default function ThreeCurveFab() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div ref={menuRef} className="fixed bottom-20 right-6 sm:hidden z-50">
      {/* Backdrop for closing */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action buttons – fan out in an arc */}
      <div className="relative">
        {open &&
          actions.map((action, idx) => {
            // Fan out in a 120° arc (from -60° to +60° relative to top)
            // Angles: 200°, 230°, 260°, 290°
            const startAngle = 200
            const angle = startAngle + idx * 30
            const rad = (angle * Math.PI) / 180
            const radius = 130
            const x = Math.cos(rad) * radius
            const y = Math.sin(rad) * radius
            
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className="absolute transition-all duration-300 ease-out"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: 1,
                  pointerEvents: 'auto',
                }}
              >
                <div
                  className={`h-12 w-12 rounded-full bg-gradient-to-r ${action.gradient} shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform`}
                >
                  {action.icon}
                </div>
              </Link>
            )
          })}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={`
            h-14 w-14 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 
            text-white shadow-2xl flex items-center justify-center 
            active:scale-95 transition-all duration-200
            ${open ? 'rotate-45' : 'rotate-0'}
          `}
        >
          <Plus className="h-6 w-6 transition-transform duration-200" />
        </button>
      </div>
    </div>
  )
}
