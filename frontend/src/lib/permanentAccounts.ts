// ─────────────────────────────────────────────────────────────────────────
// PERMANENT ACCOUNTS (dev/demo fallback login)
// These credentials are NOT stored in the database — they live only in this
// file and are checked directly in the login flow (see lib/auth.ts and
// lib/AuthContext.tsx). Useful for guaranteed access (demos, offline testing,
// admin fallback) that doesn't depend on Supabase being reachable/seeded.
//
// SECURITY (bug #2):
// - No real personal emails/passwords are hardcoded here anymore. Every
//   value is read from Vite env vars (see frontend/.env.example) and falls
//   back to an obviously-fake, non-secret placeholder — never a real
//   credential — if unset.
// - This entire list is emptied out in production builds (`import.meta.env.PROD`)
//   so it never ships in a prod bundle, regardless of what's in .env.
// - CHANGE_ME_IN_ENV is a marker, not a working password — set the real
//   password only in your local/preview .env, never commit it.
// ─────────────────────────────────────────────────────────────────────────

export interface PermanentAccount {
  email: string
  password: string
  role: 'admin' | 'client'
  fullName: string
  id: string
}

function buildAccounts(): PermanentAccount[] {
  // Disabled entirely in production builds — never ships in the prod bundle.
  if (import.meta.env.PROD) return []

  const env = import.meta.env as Record<string, string | undefined>

  return [
    {
      email: env.VITE_PERMANENT_ADMIN_EMAIL ?? 'admin@leadpilot.dev',
      password: env.VITE_PERMANENT_ADMIN_PASSWORD ?? 'CHANGE_ME_IN_ENV',
      role: 'admin',
      fullName: 'LeadPilot Admin (dev)',
      id: 'permanent-admin-uuid-0001',
    },
    {
      email: env.VITE_PERMANENT_AGENCY_ADMIN_EMAIL ?? 'agency@leadpilot.dev',
      password: env.VITE_PERMANENT_AGENCY_ADMIN_PASSWORD ?? 'CHANGE_ME_IN_ENV',
      role: 'admin',
      fullName: 'LeadPilot Agency Admin (dev)',
      id: 'permanent-admin-uuid-0003',
    },
    {
      email: env.VITE_PERMANENT_CLIENT_EMAIL ?? 'client@leadpilot.dev',
      password: env.VITE_PERMANENT_CLIENT_PASSWORD ?? 'CHANGE_ME_IN_ENV',
      role: 'client',
      fullName: 'LeadPilot Client (dev)',
      id: 'permanent-client-uuid-0002',
    },
  ]
}

export const PERMANENT_ACCOUNTS: PermanentAccount[] = buildAccounts()

/** Finds a permanent account matching email+password (case-insensitive email). */
export function findPermanentAccount(email: string, password: string): PermanentAccount | null {
  const match = PERMANENT_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === email.trim().toLowerCase() && acc.password === password
  )
  return match ?? null
}
