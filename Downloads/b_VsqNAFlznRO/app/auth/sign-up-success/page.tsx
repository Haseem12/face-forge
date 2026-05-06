'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SignUpSuccess() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent you a confirmation link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to confirm your account and start building your Face.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t get the email? Check your spam folder or try signing up again.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
