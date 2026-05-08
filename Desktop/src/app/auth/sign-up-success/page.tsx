'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, ArrowRight } from 'lucide-react'

export default function SignUpSuccess() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/onboarding')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-purple-600 rounded-full blur-lg opacity-30 animate-pulse" />
            <CheckCircle className="w-16 h-16 text-gradient-to-r from-orange-500 to-purple-600 relative" style={{color: '#5b21f5'}} />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Account Created!
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Welcome to FaceForge. Your account has been created successfully.
        </p>

        {/* Email Confirmation */}
        <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg p-4 mb-6 border border-orange-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-700 font-medium">Verification email sent</p>
          </div>
          <p className="text-xs text-gray-600">Check your inbox to confirm your email address</p>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-blue-900 mb-3">Next Steps:</p>
          <ol className="text-xs text-blue-800 space-y-2">
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">1.</span>
              <span>Verify your email address</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">2.</span>
              <span>Complete your onboarding</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">3.</span>
              <span>Create your first forge</span>
            </li>
          </ol>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link href="/onboarding">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2">
              Continue to Onboarding
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-xs text-gray-500">
            Redirecting in <span className="font-bold text-purple-600">{countdown}s</span>...
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Already verified?{' '}
            <Link href="/auth/login" className="text-purple-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
