'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', authUser.id)
          .single()

        if (!profile?.onboarding_completed) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ff-root {
          min-height: 100svh;
          background: #ffffff;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-family: 'Nunito', sans-serif;
          padding: 48px 24px 40px;
        }

        .ff-container {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        /* ── Logo ── */
        .ff-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .ff-icon {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ff-icon svg {
          width: 50px;
          height: 50px;
        }

        .ff-brand {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .ff-brand-face { color: #111111; }
        .ff-brand-forge { color: #5b21f5; }

        .ff-tagline {
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 500;
          letter-spacing: 0.1px;
        }

        /* ── Welcome ── */
        .ff-welcome {
          text-align: center;
          margin-bottom: 28px;
        }

        .ff-welcome-title {
          font-size: 22px;
          font-weight: 800;
          color: #111111;
          letter-spacing: -0.3px;
        }

        .ff-welcome-sub {
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 500;
          margin-top: 4px;
        }

        /* ── Form with thin underline style ── */
        .ff-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ff-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .ff-label {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.2px;
        }

        /* Thin underline input — no border, just bottom line */
        .ff-input-line {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid #e5e7eb;
          padding: 10px 0 6px 0;
          font-size: 17px;
          font-family: 'Nunito', sans-serif;
          font-weight: 500;
          color: #111111;
          outline: none;
          transition: border-color 0.2s ease;
          border-radius: 0;
        }

        .ff-input-line:focus {
          border-bottom-color: #5b21f5;
        }

        .ff-input-line::placeholder {
          color: #cbd5e1;
          font-weight: 400;
          font-size: 16px;
        }

        /* Password wrapper for eye button inside thin-line layout */
        .ff-password-wrap {
          position: relative;
          width: 100%;
        }

        .ff-password-input {
          width: 100%;
          padding-right: 32px;
        }

        .ff-eye-icon {
          position: absolute;
          right: 0;
          bottom: 6px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .ff-eye-icon:hover {
          color: #5b21f5;
        }

        /* ── Forgot ── */
        .ff-forgot-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
        }

        .ff-forgot {
          font-size: 13px;
          font-weight: 600;
          color: #5b21f5;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .ff-forgot:hover { opacity: 0.75; }

        /* ── Error ── */
        .ff-error {
          font-size: 12.5px;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 600;
        }

        /* ── Login Button (touch friendly) ── */
        .ff-btn-login {
          width: 100%;
          padding: 14px 0;
          background: #5b21f5;
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.2s, transform 0.05s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(91, 33, 245, 0.3);
          margin-top: 12px;
          /* large tappable area */
          min-height: 52px;
        }

        .ff-btn-login:active {
          transform: scale(0.97);
        }

        .ff-btn-login:hover:not(:disabled) {
          background: #4c1be0;
        }

        .ff-btn-login:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* ── Footer ── */
        .ff-footer {
          font-size: 14px;
          color: #9ca3af;
          font-weight: 600;
          margin-top: 32px;
          text-align: center;
        }

        .ff-footer a {
          color: #5b21f5;
          text-decoration: none;
          font-weight: 800;
          transition: opacity 0.15s;
        }

        .ff-footer a:hover { opacity: 0.75; }

        /* touch-friendly tap targets */
        button, .ff-forgot, .ff-footer a {
          touch-action: manipulation;
        }
      `}</style>

      <div className="ff-root">
        <div className="ff-container">
          {/* Logo */}
          <div className="ff-logo-wrap">
            <div className="ff-icon">
              <img src="/logo.png" alt="FaceForge" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
            </div>
           
          </div>

         

          {/* Form — no typing field borders, just thin line */}
          <form className="ff-form" onSubmit={handleLogin}>
            <div className="ff-field">
              <label className="ff-label" htmlFor="email">email address</label>
              <input
                id="email"
                className="ff-input-line"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoCapitalize="none"
              />
            </div>

            <div className="ff-field">
              <label className="ff-label" htmlFor="password">password</label>
              <div className="ff-password-wrap">
                <input
                  id="password"
                  className="ff-input-line ff-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="ff-eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="ff-forgot-wrap">
              <Link href="/auth/forgot-password" className="ff-forgot">forgot password?</Link>
            </div>

            {error && <div className="ff-error">{error}</div>}

            <button type="submit" className="ff-btn-login" disabled={isLoading}>
              {isLoading ? 'logging in...' : 'log in'}
            </button>
          </form>

          {/* Footer only — no social / divider */}
          <p className="ff-footer">
            don&apos;t have an account?{' '}
            <Link href="/auth/sign-up">sign up</Link>
          </p>
        </div>
      </div>
    </>
  )
}
