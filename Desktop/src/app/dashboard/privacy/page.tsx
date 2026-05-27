// app/dashboard/privacy/page.tsx
'use client'

import { Shield, Eye, Database, Lock, Globe, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'

export default function PrivacyPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-white/80 text-sm">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-orange-500" />
                Your Privacy Matters
              </h2>
              <p className="text-gray-600 leading-relaxed">
                At FaceForge, we take your privacy seriously. This policy describes how we collect, 
                use, and protect your personal information when you use our platform.
              </p>
            </section>
            
            {/* Information We Collect */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-500" />
                Information We Collect
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-800">Account Information:</strong> Name, email, username, profile picture</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-800">Content You Create:</strong> Forges, posts, comments, and stories</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-800">Interaction Data:</strong> Likes, follows, shares, and comments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-800">Usage Information:</strong> How you use our platform and features</span>
                </li>
              </ul>
            </section>
            
            {/* How We Use Your Information */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-orange-500" />
                How We Use Your Information
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide and improve our services</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Personalize your feed and recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Communicate important updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Ensure platform safety and security</span>
                </li>
              </ul>
            </section>
            
            {/* Data Security */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5 text-orange-500" />
                Data Security
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We use industry-standard security measures to protect your data, including encryption, 
                secure servers, and regular security audits. However, no method of transmission over 
                the internet is 100% secure.
              </p>
            </section>
            
            {/* Your Rights */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Your Rights
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Access and download your data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Delete your account and associated data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Opt out of marketing communications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Control who sees your content</span>
                </li>
              </ul>
            </section>
            
            {/* Contact */}
            <section className="bg-gray-50 rounded-xl p-4">
              <h2 className="font-bold text-gray-900 mb-2">Questions?</h2>
              <p className="text-sm text-gray-600">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-sm text-orange-600 mt-2">
                privacy@faceforge.com
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
