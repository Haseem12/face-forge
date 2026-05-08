import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Zap } from 'lucide-react'

export default function EmptyFeed() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center">
        <Compass className="h-8 w-8 text-orange-400" />
      </div>
      <h3 className="font-black text-base mb-1.5 text-gray-800">Discover Forges on Spark</h3>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed max-w-xs mx-auto">
        Follow creators to see their forges here, or explore what's trending in Spark
      </p>
      <Link href="/spark">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-purple-600 hover:opacity-90 transition shadow-md shadow-orange-200">
          <Zap className="h-4 w-4" /> Explore Spark
        </button>
      </Link>
    </div>
  )
}
// Zap icon import needed – we'll add it
// (I'll correct that in final note)