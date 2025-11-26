'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!supabase) {
      console.error('[AuthProvider] Supabase client not initialized')
      setLoading(false)
      return
    }

    let mounted = true

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data, error }: { data: { session: Session | null }, error: any }) => {
        if (!mounted) return
        
        if (error) {
          console.error('[AuthProvider] Error getting session:', error.message)
          setSession(null)
          setUser(null)
        } else {
          setSession(data.session)
          setUser(data.session?.user ?? null)
        }
        setLoading(false)
      })
      .catch((error: any) => {
        if (!mounted) return
        console.error('[AuthProvider] Unexpected error getting session:', error)
        setSession(null)
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthProvider] Token refreshed')
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('[AuthProvider] Error signing out:', error.message)
        }
      }
    } catch (error) {
      console.error('[AuthProvider] Unexpected error signing out:', error)
    } finally {
      // Always redirect, even if sign out fails
      setSession(null)
      setUser(null)
      router.push('/auth/login')
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

