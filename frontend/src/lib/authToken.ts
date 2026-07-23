/**
 * Shared helper for reading the current session's auth token.
 *
 * Checks the permanent/demo mock session (see AuthContext.tsx +
 * permanentAccounts.ts) first, then falls back to the real Supabase
 * session. This matters because `supabase.auth.getSession()` only ever
 * knows about real Supabase sessions — permanent accounts are stored
 * separately in localStorage and never touch Supabase at all, so any
 * call site that only checked Supabase would see no session and either
 * throw "must be signed in" or (as bug #1 showed) fall back to some
 * hardcoded identity instead of the actual signed-in permanent account.
 */
import { supabase } from './supabase'

export async function getAuthToken(): Promise<string | null> {
  const mockRaw = localStorage.getItem('leadpilot_mock_session')
  if (mockRaw) {
    try {
      const parsed = JSON.parse(mockRaw)
      const token = parsed?.session?.access_token
      if (typeof token === 'string' && token) return token
    } catch {
      // Corrupted localStorage entry — fall through to the real session.
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}
