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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">Resume Builder</div>
            <div className="flex items-center space-x-6">
              <Link 
                href="/auth/login" 
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/login" 
                className="bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-all font-medium shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Build Professional Resumes
              <span className="block text-gray-600 mt-2">That Get You Hired</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              Create ATS-optimized resumes tailored to any job description. 
              Professional design, unlimited customizations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/auth/login"
                className="bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Building Free
              </Link>
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all">
                View Examples
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-6">No credit card required • Free forever</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                Everything You Need to Build the Perfect Resume
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Professional tools designed to help you stand out in today's competitive job market
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-all border border-gray-100">
                <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900">ATS Optimized</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatically match your resume with job descriptions using intelligent keyword optimization. Pass through Applicant Tracking Systems with ease.
                </p>
              </div>
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-all border border-gray-100">
                <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900">Professional Design</h3>
                <p className="text-gray-600 leading-relaxed">
                  Choose from clean, modern templates that recruiters love. Professional formatting that makes a great first impression.
                </p>
              </div>
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-all border border-gray-100">
                <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900">One-Time Setup</h3>
                <p className="text-gray-600 leading-relaxed">
                  Enter your information once. Generate unlimited customized resumes for different job applications in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                How It Works
              </h2>
              <p className="text-xl text-gray-600">
                Build your perfect resume in three simple steps
              </p>
            </div>
            <div className="space-y-12">
              <div className="flex items-start gap-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-gray-900">Build Your Resume</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Fill out your professional details in our intuitive builder. Add your work experience, education, skills, and achievements. Save your information securely.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-gray-900">Add Job Description</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    When you find a job you want to apply for, simply paste the job description. Our system analyzes it instantly to identify key requirements and keywords.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3 text-gray-900">Download & Apply</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Get your optimized resume tailored to the job. Review, make any adjustments, and download as PDF. You're ready to apply with confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Ready to Build Your Perfect Resume?
              </h2>
              <p className="text-xl mb-10 text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Join professionals who are landing more interviews with resumes built specifically for each job application.
              </p>
              <Link 
                href="/auth/login"
                className="inline-block bg-white text-gray-900 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all shadow-xl transform hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
              <p className="text-sm text-gray-400 mt-6">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container mx-auto px-6">
          <div className="text-center text-gray-600">
            <p className="font-medium">&copy; 2024 Resume Builder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
