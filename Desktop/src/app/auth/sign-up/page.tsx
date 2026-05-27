'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const supabase = createClient()

  // Auto-focus first input when code screen appears
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
      const fullCode = newCode.join('')
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

  // Step 1: Create account and send OTP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        }
      })

      if (error) throw error

      if (data.user) {
        setTempUserId(data.user.id)
        
        // Send OTP code for verification
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          }
        })

        if (otpError) throw otpError

        setShowCodeInput(true)
        setCountdown(60)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP and create profile
  const handleVerifyCode = async (verificationCode: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Verify the OTP code
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      })

      if (error) throw error

      if (data.user) {
        // Generate username from email
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`
        const displayName = email.split('@')[0]

        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            display_name: displayName,
            username: username,
            created_at: new Date().toISOString(),
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

  const EyeOpen = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  const EyeOff = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

  // Code Verification UI
  if (showCodeInput) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .ff-root {
            min-height: 100svh; background: #ffffff; display: flex;
            align-items: center; justify-content: center;
            font-family: 'Nunito', sans-serif; padding: 48px 24px 40px;
          }
          .ff-container { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; }
          .ff-code-input {
            width: 52px; height: 60px; text-align: center; font-size: 24px; font-weight: 700;
            border: 2px solid #e5e7eb; border-radius: 12px; background: #f9fafb;
            font-family: 'Nunito', monospace; transition: all 0.2s;
          }
          .ff-code-input:focus {
            border-color: #f97316; outline: none; box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
          }
          .ff-btn-submit {
            width: 100%; height: 52px; background: linear-gradient(135deg, #f97316, #8b5cf6);
            color: #ffffff; font-size: 15px; font-weight: 800; font-family: 'Nunito', sans-serif;
            border: none; border-radius: 14px; cursor: pointer; transition: opacity 0.2s;
          }
          .ff-btn-submit:hover:not(:disabled) { opacity: 0.9; }
          .ff-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
          .ff-resend-btn { background: none; border: none; color: #f97316; font-weight: 600; cursor: pointer; }
          .ff-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .ff-error { font-size: 12.5px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; }
        `}</style>

        <div className="ff-root">
          <div className="ff-container">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Verify your email</h2>
              <p className="text-gray-500 text-sm">
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
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="ff-code-input w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold"
                />
              ))}
            </div>

            {error && <div className="ff-error w-full mb-4">{error}</div>}

            <button
              onClick={() => handleVerifyCode(code.join(''))}
              disabled={isLoading || code.join('').length !== 6}
              className="ff-btn-submit mb-4"
            >
              {isLoading ? 'verifying...' : 'verify & continue'}
            </button>

            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={countdown > 0}
                className="ff-resend-btn text-sm"
              >
                {countdown > 0 ? `resend in ${countdown}s` : 'resend code'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Sign Up Form UI
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ff-root {
          min-height: 100svh; background: #ffffff; display: flex;
          align-items: flex-start; justify-content: center;
          font-family: 'Nunito', sans-serif; padding: 48px 24px 40px;
        }
        .ff-container { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; }
        .ff-logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 28px; }
        .ff-icon { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
        .ff-icon img { width: 80px; height: 80px; object-fit: contain; }
        .ff-brand { font-size: 30px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
        .ff-brand-face { color: #111111; }
        .ff-brand-forge { color: #5b21f5; }
        .ff-tagline { font-size: 13.5px; color: #9ca3af; font-weight: 500; }
        .ff-welcome { text-align: center; margin-bottom: 28px; }
        .ff-welcome-title { font-size: 22px; font-weight: 800; color: #111111; letter-spacing: -0.3px; }
        .ff-welcome-sub { font-size: 13.5px; color: #9ca3af; font-weight: 500; margin-top: 4px; }
        .ff-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
        .ff-field { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .ff-label { font-size: 13px; font-weight: 700; color: #374151; }
        .ff-input-wrap { position: relative; width: 100%; }
        .ff-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #c4c9d4; display: flex; align-items: center; }
        .ff-input {
          width: 100%; height: 52px; border: 1.5px solid #e5e7eb; border-radius: 14px;
          background: #f9fafb; padding: 0 44px 0 42px; font-size: 14px;
          font-family: 'Nunito', sans-serif; font-weight: 500; color: #111111; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .ff-input::placeholder { color: #b5bbc6; }
        .ff-input:focus { border-color: #5b21f5; background: #ffffff; box-shadow: 0 0 0 3px rgba(91,33,245,0.1); }
        .ff-eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #b5bbc6; display: flex; align-items: center; padding: 4px; transition: color 0.15s; }
        .ff-eye-btn:hover { color: #5b21f5; }
        .ff-error { font-size: 12.5px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; font-weight: 600; }
        .ff-btn-submit {
          width: 100%; height: 52px; background: #5b21f5; color: #ffffff; font-size: 15px;
          font-weight: 800; font-family: 'Nunito', sans-serif; border: none; border-radius: 14px;
          cursor: pointer; letter-spacing: 0.3px; margin-top: 4px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(91,33,245,0.35);
        }
        .ff-btn-submit:hover:not(:disabled) { background: #4c1be0; box-shadow: 0 6px 24px rgba(91,33,245,0.45); transform: translateY(-1px); }
        .ff-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .ff-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .ff-footer { font-size: 13.5px; color: #9ca3af; font-weight: 600; margin-top: 20px; text-align: center; }
        .ff-footer a { color: #5b21f5; text-decoration: none; font-weight: 800; transition: opacity 0.15s; }
        .ff-footer a:hover { opacity: 0.75; }
      `}</style>

      <div className="ff-root">
        <div className="ff-container">

          <div className="ff-logo-wrap">
            <div className="ff-icon">
              <img src="/logo.png" alt="FaceForge logo" />
            </div>
            <div className="ff-brand">
              <span className="ff-brand-face">Face</span><span className="ff-brand-forge">Forge</span>
            </div>
            <p className="ff-tagline">build your identity, shape your world.</p>
          </div>

          <div className="ff-welcome">
            <h1 className="ff-welcome-title">create account</h1>
            <p className="ff-welcome-sub">join FaceForge and start building</p>
          </div>

          <form className="ff-form" onSubmit={handleSignUp}>

            <div className="ff-field">
              <label className="ff-label" htmlFor="email">email</label>
              <div className="ff-input-wrap">
                <span className="ff-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email" className="ff-input" type="email"
                  placeholder="name@example.com" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="ff-field">
              <label className="ff-label" htmlFor="password">password</label>
              <div className="ff-input-wrap">
                <span className="ff-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password" className="ff-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="create a password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="ff-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="ff-field">
              <label className="ff-label" htmlFor="repeat-password">confirm password</label>
              <div className="ff-input-wrap">
                <span className="ff-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="repeat-password" className="ff-input"
                  type={showRepeat ? 'text' : 'password'}
                  placeholder="repeat your password" required
                  value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)}
                />
                <button type="button" className="ff-eye-btn" onClick={() => setShowRepeat(!showRepeat)}>
                  {showRepeat ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {error && <div className="ff-error">{error}</div>}

            <button type="submit" className="ff-btn-submit" disabled={isLoading}>
              {isLoading ? 'creating account...' : 'create account'}
            </button>

          </form>

          <p className="ff-footer">
            already have an account?{' '}
            <Link href="/auth/login">sign in</Link>
          </p>

        </div>
      </div>
    </>
  )
}
