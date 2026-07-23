/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL?: string
  // Dev/demo-only permanent login accounts (bug #2 fix). Never set these in
  // a production .env — the accounts are disabled entirely in prod builds
  // regardless (see lib/permanentAccounts.ts).
  readonly VITE_PERMANENT_ADMIN_EMAIL?: string
  readonly VITE_PERMANENT_ADMIN_PASSWORD?: string
  readonly VITE_PERMANENT_AGENCY_ADMIN_EMAIL?: string
  readonly VITE_PERMANENT_AGENCY_ADMIN_PASSWORD?: string
  readonly VITE_PERMANENT_CLIENT_EMAIL?: string
  readonly VITE_PERMANENT_CLIENT_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
