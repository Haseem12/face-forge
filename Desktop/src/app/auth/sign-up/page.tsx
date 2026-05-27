'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const supabase = createClient()

  // Auto-focus next input on code entry
  useEffect(() => {
    if (showCodeInput) {
      inputRefs.current[0]?.focus()
    }
  }, [showCodeInput])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join('')
      if (fullCode.length === 6) {
        handleVerifyCode(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Step 1: Send OTP code (no signup yet)
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!email) {
      setError('Please enter your email')
      setIsLoading(false)
      return
    }

    try {
      // Supabase sends 6-digit OTP to email automatically[citation:4]
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Creates user if doesn't exist
        }
      })

      if (error) throw error

      setShowCodeInput(true)
      setCountdown(60)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to send code')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP code and complete signup
  const handleVerifyCode = async (verificationCode: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Verify the OTP code[citation:4][citation:8]
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      })

      if (error) throw error

      if (data.user) {
        // Generate username from email
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() 
          + Math.floor(Math.random() * 1000)
        const displayName = email.split('@')[0]

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            display_name: displayName,
            username: username,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        router.push('/dashboard')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Invalid code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    
    setCountdown(60)
    try {
      await supabase.auth.signInWithOtp({ email })
    } catch (error) {
      console.error('Resend failed:', error)
    }
  }

  const handleCodeChangeWrapper = (index: number, value: string) => {
    handleCodeChange(index, value)
  }

  if (showCodeInput) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900">Check your email</h2>
            <p className="text-gray-500 mt-2">
              Enter the 6-digit code sent to<br />
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
          </div>

          <div className="flex gap-3 justify-center mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChangeWrapper(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-orange-500 focus:outline-none"
              />
            ))}
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <button
            onClick={() => handleVerifyCode(code.join(''))}
            disabled={isLoading || code.join('').length !== 6}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-bold disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify & Create Account'}
          </button>

          <div className="mt-4">
            <button
              onClick={handleResendCode}
              disabled={countdown > 0}
              className="text-orange-500 text-sm disabled:text-gray-400"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Sign Up Form
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1 mb-4">
            <span className="text-3xl font-black text-gray-900">Face</span>
            <span className="text-3xl font-black text-orange-500">Forge</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Create account</h1>
          <p className="text-gray-500">Enter your email to get started</p>
        </div>

        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full font-bold disabled:opacity-50"
          >
            {isLoading ? 'Sending code...' : 'Continue with Email'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-orange-500 font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
