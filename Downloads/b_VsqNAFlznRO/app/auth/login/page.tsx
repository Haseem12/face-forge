'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 items-center justify-center p-10">
        <div className="text-center text-white">
          <div className="text-6xl font-bold mb-4">F</div>
          <h1 className="text-4xl font-bold mb-3">FaceForge</h1>
          <p className="text-lg opacity-90">Build your identity,<br/>shape your world</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">FaceForge</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription className="text-xs">
                Continue to your FaceForge account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm h-10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-sm h-10"
                    />
                  </div>
                  {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                  <Button 
                    type="submit" 
                    className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/sign-up" className="text-primary font-semibold hover:underline">
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
