import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type User, type Session } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { findPermanentAccount } from '@/lib/permanentAccounts'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, pass: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Fetches the signed-in user's profile and enforces `status === 'blocked'`.
   * Covers both paths that can hand a blocked user a session: signing in
   * fresh, and restoring a session that was fine when it was created but
   * whose account was blocked by an admin since (initial load / auth state
   * change). In both cases this signs the user out immediately and returns
   * null instead of setting `profile` — callers that need to show a visible
   * error message (signIn) check for that null return themselves.
   */
  const fetchProfile = async (userId: string, userEmail?: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!data) return null

    const p = data as Profile
    const adminEmails = ['jayeshadsagncy@gmail.com', 'jayeshvishwakarma42@gmail.com']
    if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
      p.role = 'admin'
    }

    if (p.status === 'blocked') {
      localStorage.removeItem('leadpilot_mock_session')
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.error(e)
      }
      setUser(null)
      setSession(null)
      setProfile(null)
      return null
    }

    setProfile(p)
    return p
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email)
  }

  const signIn = async (email: string, pass: string) => {
    // Check permanent hardcoded accounts first (see lib/permanentAccounts.ts).
    // This prevents offline network "Failed to fetch" errors and guarantees
    // access regardless of Supabase/database state.
    const permanent = findPermanentAccount(email, pass)
    if (permanent) {
      const mockUser = {
        id: permanent.id,
        email: permanent.email,
      } as User
      const mockSession = {
        // bug #1 fix: the id must travel with the token, or the backend has
        // no way to tell which permanent account this is (previously every
        // permanent account — including the "client" demo login — sent the
        // exact same string and the backend mapped it to a hardcoded admin
        // identity). See backend/app/auth.py's _PERMANENT_ACCOUNTS.
        access_token: `permanent-access-token:${permanent.id}`,
        user: mockUser
      } as Session
      const mockProfile = {
        id: permanent.id,
        email: permanent.email,
        phone: '+919999999999',
        full_name: permanent.fullName,
        telegram: null,
        role: permanent.role,
        email_verified: true,
        phone_verified: true,
        status: 'active',
        funds_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Profile
      localStorage.setItem('leadpilot_mock_session', JSON.stringify({ session: mockSession, profile: mockProfile }))
      setSession(mockSession)
      setUser(mockUser)
      setProfile(mockProfile)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) throw error
    if (data.session) {
      setSession(data.session)
      setUser(data.user)
      const profile = await fetchProfile(data.user.id, data.user.email ?? undefined)
      if (!profile) {
        throw new Error('Your account has been blocked. Please contact support.')
      }
    }
  }

  useEffect(() => {
    // Check mock session first
    const mockSaved = localStorage.getItem('leadpilot_mock_session')
    if (mockSaved) {
      try {
        const parsed = JSON.parse(mockSaved)
        setSession(parsed.session)
        setUser(parsed.session.user)
        setProfile(parsed.profile)
        setLoading(false)
        return
      } catch (e) {
        console.error(e)
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // If mock session is active, ignore auth state changes to avoid overriding
        if (localStorage.getItem('leadpilot_mock_session')) return

        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    localStorage.removeItem('leadpilot_mock_session')
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
