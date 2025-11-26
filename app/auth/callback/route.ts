import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Runtime validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export async function GET(request: NextRequest) {
  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Auth Callback] Missing Supabase environment variables')
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL('/auth/login?error=configuration', requestUrl.origin))
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  // Validate code parameter
  if (!code) {
    console.error('[Auth Callback] No authorization code provided')
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_code', requestUrl.origin)
    )
  }

  // Validate code format (basic security check)
  if (code.length > 500 || !/^[A-Za-z0-9_-]+$/.test(code)) {
    console.error('[Auth Callback] Invalid code format')
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_code', requestUrl.origin)
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] Session exchange error:', exchangeError.message)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
    }

    if (!data.session) {
      console.error('[Auth Callback] No session returned from exchange')
      return NextResponse.redirect(
        new URL('/auth/login?error=no_session', requestUrl.origin)
      )
    }

    // Success - redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    
    // Set secure session cookie (Supabase handles this, but we ensure proper redirect)
    return response
  } catch (error: any) {
    console.error('[Auth Callback] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=unexpected_error', requestUrl.origin)
    )
  }
}

