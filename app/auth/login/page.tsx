'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  // Check for error in URL params (from callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate password strength
  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters'
    }
    return null
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // Client-side validation
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError('Password is required')
      setLoading(false)
      return
    }

    if (isSignUp) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        setError(passwordError)
        setLoading(false)
        return
      }
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })

        if (error) {
          // Don't expose detailed error messages for security
          if (error.message.includes('already registered')) {
            setError('An account with this email already exists. Please sign in instead.')
          } else if (error.message.includes('email')) {
            setError('Invalid email address. Please check and try again.')
          } else {
            setError('Unable to create account. Please try again.')
          }
          setLoading(false)
          return
        }

        if (data.user && !data.session) {
          setMessage('Check your email for the confirmation link!')
        } else if (data.session) {
          router.push('/dashboard')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        })

        if (error) {
          // Generic error messages to prevent user enumeration
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('Email not confirmed')) {
            setError('Invalid email or password. Please check your credentials and try again.')
          } else {
            setError('Unable to sign in. Please try again.')
          }
          setLoading(false)
          return
        }

        if (data.session) {
          router.push('/dashboard')
        } else {
          setError('Unable to sign in. Please try again.')
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight">
              Resume Builder
            </Link>
            <Link 
              href="/" 
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-lg text-gray-600">
              {isSignUp ? 'Start building professional resumes' : 'Sign in to continue building your resume'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <form className="space-y-6" onSubmit={handleAuth}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {message}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                    setMessage('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  {isSignUp ? (
                    <>Already have an account? <span className="text-gray-900 font-semibold">Sign in</span></>
                  ) : (
                    <>Don't have an account? <span className="text-gray-900 font-semibold">Sign up</span></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

