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

// Main FAB actions
const mainActions: Action[] = [
  {
    href: '/dashboard/forges/create',
    icon: <Sparkles className="h-5 w-5" />,
    label: 'Create Forge',
    gradient: 'from-pink-500 to-orange-500',
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
    label: 'Messages',
    gradient: 'from-purple-500 to-indigo-500',
  },
]

// Create options (sub-menu when clicking Create)
const createOptions: Action[] = [
  {
    href: '/dashboard/forges/create',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'New Forge',
    gradient: 'from-pink-500 to-orange-500',
  },
  {
    href: '/dashboard/feeds/create',
    icon: <PenTool className="h-4 w-4" />,
    label: 'Write Feed',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    href: '/dashboard/feeds/create?type=media',
    icon: <ImageIcon className="h-4 w-4" />,
    label: 'Share Media',
    gradient: 'from-blue-500 to-cyan-500',
  },
]

export default function ThreeCurveFab() {
  const [open, setOpen] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreateMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setShowCreateMenu(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleMainAction = (action: Action) => {
    if (action.label === 'Create Forge' || action.label === 'Create') {
      setShowCreateMenu(!showCreateMenu)
      return
    }
    setOpen(false)
  }

  const actionsToShow = showCreateMenu ? createOptions : mainActions

  return (
    <div ref={menuRef} className="fixed bottom-20 right-6 sm:hidden z-50">
      {/* Backdrop for closing */}
      {(open || showCreateMenu) && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => {
            setOpen(false)
            setShowCreateMenu(false)
          }}
        />
      )}

      {/* Action buttons – fan out with spring animation */}
      <div className="relative">
        {open &&
          actionsToShow.map((action, idx) => {
            // Fan out in an arc
            const startAngle = showCreateMenu ? 180 : 200
            const angle = startAngle + idx * 30
            const rad = (angle * Math.PI) / 180
            const radius = 140
            const x = Math.cos(rad) * radius
            const y = Math.sin(rad) * radius
            
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => {
                  setOpen(false)
                  setShowCreateMenu(false)
                }}
                className="absolute transition-all duration-300 ease-out"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: 1,
                  pointerEvents: 'auto',
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`h-12 w-12 rounded-full bg-gradient-to-r ${action.gradient} shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform`}
                  >
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-semibold bg-black/70 backdrop-blur px-2 py-0.5 rounded-full text-white whitespace-nowrap">
                    {action.label}
                  </span>
                </div>
              </Link>
            )
          })}

        {/* Main FAB button */}
        <button
          onClick={() => {
            if (!open) {
              setOpen(true)
              setShowCreateMenu(false)
            } else if (showCreateMenu) {
              setShowCreateMenu(false)
            } else {
              setOpen(false)
            }
          }}
          className={`
            h-14 w-14 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 
            text-white shadow-2xl flex items-center justify-center 
            active:scale-95 transition-all duration-200
            ${open ? 'rotate-45' : 'rotate-0'}
          `}
        >
          <Plus className="h-6 w-6 transition-transform duration-200" />
        </button>

        {/* Create menu indicator when Create is selected */}
        {open && !showCreateMenu && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-black/70 backdrop-blur text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              Tap Create for options
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
