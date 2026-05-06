'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>Something went wrong</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {error ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Error:</span> {error}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              An unspecified error occurred during authentication. This could happen if your confirmation link expired or was invalid.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/auth/sign-up">Sign Up Again</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          }
        >
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  )
}
