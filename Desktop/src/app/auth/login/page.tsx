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

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
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

        /* ── Form ── */
        .ff-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ff-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .ff-label {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          letter-spacing: 0.1px;
        }

        .ff-input-wrap {
          position: relative;
          width: 100%;
        }

        .ff-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #c4c9d4;
          display: flex;
          align-items: center;
        }

        .ff-input {
          width: 100%;
          height: 52px;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
          padding: 0 44px 0 42px;
          font-size: 14px;
          font-family: 'Nunito', sans-serif;
          font-weight: 500;
          color: #111111;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .ff-input::placeholder { color: #b5bbc6; }

        .ff-input:focus {
          border-color: #5b21f5;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(91, 33, 245, 0.1);
        }

        .ff-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #b5bbc6;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }

        .ff-eye-btn:hover { color: #5b21f5; }

        /* ── Forgot ── */
        .ff-forgot-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }

        .ff-forgot {
          font-size: 13px;
          font-weight: 700;
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

        /* ── Login Button ── */
        .ff-btn-login {
          width: 100%;
          height: 52px;
          background: #5b21f5;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(91, 33, 245, 0.35);
          margin-top: 4px;
        }

        .ff-btn-login:hover:not(:disabled) {
          background: #4c1be0;
          box-shadow: 0 6px 24px rgba(91, 33, 245, 0.45);
          transform: translateY(-1px);
        }

        .ff-btn-login:active:not(:disabled) { transform: translateY(0); }

        .ff-btn-login:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* ── Divider ── */
        .ff-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          margin: 20px 0 4px;
        }

        .ff-divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .ff-divider-text {
          font-size: 12.5px;
          color: #9ca3af;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── Social Buttons ── */
        .ff-socials {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 4px;
        }

        .ff-btn-social {
          width: 100%;
          height: 52px;
          background: #ffffff;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          color: #374151;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.15s;
        }

        .ff-btn-social:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        /* ── Footer ── */
        .ff-footer {
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 600;
          margin-top: 20px;
          text-align: center;
        }

        .ff-footer a {
          color: #5b21f5;
          text-decoration: none;
          font-weight: 800;
          transition: opacity 0.15s;
        }

        .ff-footer a:hover { opacity: 0.75; }
      `}</style>

      <div className="ff-root">
        <div className="ff-container">

          {/* Logo */}
          <div className="ff-logo-wrap">
            <div className="ff-icon">
              {/* Pixelated/dissolving F logo matching the image */}
             <img src="/logo.png" alt="FaceForge" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
            </div>
            <div className="ff-brand">
              <span className="ff-brand-face">Face</span><span className="ff-brand-forge">Forge</span>
            </div>
            <p className="ff-tagline">build your identity, shape your world.</p>
          </div>

          {/* Welcome */}
          <div className="ff-welcome">
            <h1 className="ff-welcome-title">welcome back</h1>
            <p className="ff-welcome-sub">log in to continue building</p>
          </div>

          {/* Form */}
          <form className="ff-form" onSubmit={handleLogin}>
            <div className="ff-field">
              <label className="ff-label" htmlFor="email">email address</label>
              <div className="ff-input-wrap">
                <span className="ff-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  className="ff-input"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="ff-field">
              <label className="ff-label" htmlFor="password">password</label>
              <div className="ff-input-wrap">
                <span className="ff-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  className="ff-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="ff-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Divider */}
          <div className="ff-divider">
            <div className="ff-divider-line" />
            <span className="ff-divider-text">or continue with</span>
            <div className="ff-divider-line" />
          </div>

          {/* Social Buttons */}
          <div className="ff-socials">
            <button type="button" className="ff-btn-social" onClick={() => handleOAuth('google')}>
              {/* Google Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              continue with google
            </button>

            <button type="button" className="ff-btn-social" onClick={() => handleOAuth('apple')}>
              {/* Apple Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z" />
                <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
              </svg>
              continue with apple
            </button>

            <button type="button" className="ff-btn-social" onClick={() => handleOAuth('github')}>
              {/* GitHub Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              continue with github
            </button>
          </div>

          <p className="ff-footer">
            don&apos;t have an account?{' '}
            <Link href="/auth/sign-up">sign up</Link>
          </p>
        </div>
      </div>
    </>
  )
}  