'use client'

import { lazy, Suspense } from 'react'

const Navigation = lazy(() => import('./Navigation'))

export default function NavigationWrapper() {
  return (
    <Suspense fallback={null}>
      <Navigation />
    </Suspense>
  )
}
