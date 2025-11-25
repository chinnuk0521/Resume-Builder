'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">Resume Optimizer</div>
          <div className="space-x-4">
            <Link href="/auth/login" className="text-gray-700 hover:text-blue-600 transition">
              Sign In
            </Link>
            <Link 
              href="/auth/login" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Resume into an
            <span className="text-blue-600"> ATS Magnet</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get shortlisted by matching your resume with job descriptions. 
            One-time setup, unlimited optimizations for any role.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              Start Free
            </Link>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition">
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Resume Optimizer?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">95%+ Keyword Match</h3>
              <p className="text-gray-600">
                Automatically match your resume with job descriptions using AI-powered keyword optimization.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">One-Time Setup</h3>
              <p className="text-gray-600">
                Enter your resume details once. Optimize for unlimited job descriptions instantly.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">ATS-Friendly Format</h3>
              <p className="text-gray-600">
                Clean, structured format that passes through Applicant Tracking Systems effortlessly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              How It Works
            </h2>
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
                  <p className="text-gray-600">
                    Fill out your resume details in our simple form. Add your experience, education, skills, and more.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Paste Job Description</h3>
                  <p className="text-gray-600">
                    When applying for a job, simply paste the job description. Our AI analyzes it instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Get Optimized Resume</h3>
                  <p className="text-gray-600">
                    Your resume is automatically optimized with the right keywords. Download and apply!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Shortlisted?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of job seekers who are getting more interviews with optimized resumes.
          </p>
          <Link 
            href="/auth/login"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 Resume Optimizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
