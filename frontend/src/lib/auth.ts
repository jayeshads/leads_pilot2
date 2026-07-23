import { supabase } from './supabase'

export async function signUpUser({
  email,
  password,
  phone,
  fullName,
  telegram,
}: {
  email: string
  password: string
  phone: string
  fullName: string
  telegram?: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: { full_name: fullName, phone, telegram: telegram || null },
    },
  })

  if (error) throw error
  if (!data.user) throw new Error('Signup failed — no user returned')

  // The database trigger in supabase/migrations/002_supabase_email_confirmation.sql
  // creates the profile from this user metadata. This is necessary because Confirm
  // email deliberately returns no authenticated session until the link is clicked.
  return data.user
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function forgotPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function resetPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('91') && cleaned.length === 12) return '+' + cleaned
  if (cleaned.length === 10) return '+91' + cleaned
  return '+' + cleaned
}
