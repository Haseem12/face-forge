'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, PenTool, MessageCircle, Zap, Rocket, Send } from 'lucide-react'
import CreatePostModal from '@/components/CreatePostModal'
import { createClient } from '@/lib/supabase/client'

interface Action {
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
  gradient: string
  glowColor: string
  iconAnimation: string
}

const actions: Action[] = [
  {
    href: '/dashboard/forges/create',
    icon: <Sparkles className="h-5 w-5" />,
    label: 'Create',
    gradient: 'from-pink-500 to-orange-500',
    glowColor: 'shadow-pink-500/50',
    iconAnimation: 'animate-pulse-slow',
  },
  {
    // Remove href, we'll use onClick to open modal
    icon: <PenTool className="h-5 w-5" />,
    label: 'Post',
    gradient: 'from-blue-500 to-cyan-500',
    glowColor: 'shadow-blue-500/50',
    iconAnimation: 'animate-bounce-slow',
  },
  {
    href: '/messages',
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'Message',
    gradient: 'from-purple-500 to-indigo-500',
    glowColor: 'shadow-purple-500/50',
    iconAnimation: 'animate-ping-slow',
  },
]

export default function ThreeCurveFab() {
  const [open, setOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [ripple, setRipple] = useState(false)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [supabase])

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

  const handleFabClick = () => {
    setRipple(true)
    setTimeout(() => setRipple(false), 500)
    setOpen(!open)
  }

  const handleActionClick = (action: Action) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      // Navigation will be handled by Link component
      setOpen(false)
    }
  }

  const handlePostClick = () => {
    setOpen(false)
    setIsPostModalOpen(true)
  }

  const handlePostCreated = () => {
    // Refresh feed or show success toast
    console.log('Post created successfully')
  }

  // Update the Post action with onClick
  const updatedActions = actions.map(action => 
    action.label === 'Post' 
      ? { ...action, onClick: handlePostClick }
      : action
  )

  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ripple-effect {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-ripple {
          animation: ripple-effect 0.5s ease-out forwards;
        }
        .hover-glow:hover {
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.5));
        }
      `}</style>

      <div ref={menuRef} className="fixed bottom-24 right-6 sm:hidden z-50">
        {/* Animated backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent backdrop-blur-md -z-10 transition-all duration-500"
            onClick={() => setOpen(false)}
          >
            {/* Decorative particles */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        )}

        {/* Orbiting particles when open */}
        {open && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full animate-spin-slow"
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: `${Math.cos(i * 60 * Math.PI / 180) * 100}px ${Math.sin(i * 60 * Math.PI / 180) * 100}px`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Action buttons – 3D fan out */}
        <div className="relative">
          {open &&
            updatedActions.map((action, idx) => {
              // 3D fan angles with depth
              const angle = 190 + idx * 35
              const rad = (angle * Math.PI) / 180
              const radius = 140
              const x = Math.cos(rad) * radius
              const y = Math.sin(rad) * radius
              const zIndex = 10 - idx
              const delay = idx * 0.05
              
              // If it has href, use Link; otherwise use button
              if (action.href) {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="absolute group transition-all duration-500 ease-out transform-gpu"
                    style={{
                      transform: `translate(${x}px, ${y}px) translateZ(${idx * 10}px) rotate(${idx * 5}deg)`,
                      opacity: 1,
                      pointerEvents: 'auto',
                      zIndex,
                      transitionDelay: `${delay}s`,
                    }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div
                          className={`absolute inset-0 rounded-full bg-gradient-to-r ${action.gradient} blur-xl transition-all duration-300 ${
                            hoveredIndex === idx ? 'opacity-100 scale-110' : 'opacity-50 scale-100'
                          }`}
                        />
                        <div
                          className={`relative h-14 w-14 rounded-full bg-gradient-to-r ${action.gradient} shadow-2xl flex items-center justify-center text-white transition-all duration-300 transform-gpu hover:scale-110 active:scale-95 ${
                            hoveredIndex === idx ? 'scale-110 shadow-2xl' : 'scale-100'
                          }`}
                          style={{
                            boxShadow: hoveredIndex === idx 
                              ? `0 10px 30px -5px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)`
                              : `0 5px 20px -3px rgba(0,0,0,0.2)`,
                            transformStyle: 'preserve-3d',
                            transform: hoveredIndex === idx ? 'translateZ(10px) rotateX(5deg)' : 'translateZ(0)',
                          }}
                        >
                          <div className={action.iconAnimation}>
                            {action.icon}
                          </div>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div
                          className={`absolute inset-0 rounded-full border-2 border-white/30 animate-spin-slow pointer-events-none ${
                            hoveredIndex === idx ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ animationDuration: '3s' }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-lg transition-all duration-300 border border-white/20 ${
                          hoveredIndex === idx ? 'scale-110 bg-black/90' : 'scale-100'
                        }`}
                        style={{
                          transform: hoveredIndex === idx ? 'translateY(-2px)' : 'translateY(0)',
                        }}
                      >
                        {action.label}
                      </span>
                    </div>
                  </Link>
                )
              }
              
              // For Post button (no href) - use button with onClick
              return (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.onClick) action.onClick()
                    setOpen(false)
                  }}
                  className="absolute group transition-all duration-500 ease-out transform-gpu"
                  style={{
                    transform: `translate(${x}px, ${y}px) translateZ(${idx * 10}px) rotate(${idx * 5}deg)`,
                    opacity: 1,
                    pointerEvents: 'auto',
                    zIndex,
                    transitionDelay: `${delay}s`,
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-r ${action.gradient} blur-xl transition-all duration-300 ${
                          hoveredIndex === idx ? 'opacity-100 scale-110' : 'opacity-50 scale-100'
                        }`}
                      />
                      <div
                        className={`relative h-14 w-14 rounded-full bg-gradient-to-r ${action.gradient} shadow-2xl flex items-center justify-center text-white transition-all duration-300 transform-gpu hover:scale-110 active:scale-95 ${
                          hoveredIndex === idx ? 'scale-110 shadow-2xl' : 'scale-100'
                        }`}
                        style={{
                          boxShadow: hoveredIndex === idx 
                            ? `0 10px 30px -5px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)`
                            : `0 5px 20px -3px rgba(0,0,0,0.2)`,
                          transformStyle: 'preserve-3d',
                          transform: hoveredIndex === idx ? 'translateZ(10px) rotateX(5deg)' : 'translateZ(0)',
                        }}
                      >
                        <div className={action.iconAnimation}>
                          {action.icon}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div
                        className={`absolute inset-0 rounded-full border-2 border-white/30 animate-spin-slow pointer-events-none ${
                          hoveredIndex === idx ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ animationDuration: '3s' }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-bold bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-lg transition-all duration-300 border border-white/20 ${
                        hoveredIndex === idx ? 'scale-110 bg-black/90' : 'scale-100'
                      }`}
                      style={{
                        transform: hoveredIndex === idx ? 'translateY(-2px)' : 'translateY(0)',
                      }}
                    >
                      {action.label}
                    </span>
                  </div>
                </button>
              )
            })}

          {/* Main FAB button with 3D animation */}
          <div className="relative">
            {/* Pulsing background rings */}
            {open && (
              <>
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 animate-ping opacity-40" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 animate-pulse opacity-60" style={{ animationDuration: '2s' }} />
              </>
            )}
            
            {/* Ripple effect */}
            {ripple && (
              <div className="absolute inset-0 rounded-full bg-white animate-ripple pointer-events-none" />
            )}
            
            {/* Main button */}
            <button
              onClick={handleFabClick}
              className={`
                relative h-16 w-16 rounded-full bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 
                text-white shadow-2xl flex items-center justify-center 
                active:scale-95 transition-all duration-500 transform-gpu
                hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105
                ${open ? 'rotate-45 shadow-xl' : 'rotate-0 shadow-2xl'}
              `}
              style={{
                transformStyle: 'preserve-3d',
                transform: open ? 'rotate(45deg) translateZ(10px)' : 'rotate(0deg) translateZ(0)',
              }}
            >
              {/* Floating particles */}
              {!open && (
                <>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse delay-700" />
                  <div className="absolute top-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-300" />
                </>
              )}
              
              {/* Main icon */}
              <Plus className={`h-7 w-7 transition-all duration-500 ${open ? 'rotate-45 scale-110' : 'rotate-0'}`} />
              
              {/* Shine overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 via-white/30 to-white/60 opacity-0 hover:opacity-100 transition-opacity rounded-full" />
            </button>
            
            {/* Orbiting decorative rings */}
            {!open && (
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/30 animate-spin-slow pointer-events-none" />
            )}
          </div>
        </div>
        
        {/* Floating sparkles when closed */}
        {!open && (
          <div className="absolute -top-8 -right-4 pointer-events-none">
            <div className="flex gap-1">
              <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
              <Rocket className="h-3 w-3 text-pink-400 animate-bounce-slow" />
              <Sparkles className="h-2 w-2 text-purple-400 animate-pulse delay-500" />
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {userId && (
        <CreatePostModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          onPostCreated={handlePostCreated}
          userId={userId}
        />
      )}
    </>
  )
}
