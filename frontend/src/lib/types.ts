export type UserRole = 'client' | 'admin'

export interface Profile {
  id: string
  email: string
  phone: string
  full_name: string
  telegram?: string | null
  role: UserRole
  email_verified: boolean
  phone_verified: boolean
  status: 'active' | 'blocked'
  funds_frozen: boolean
  created_at: string
  updated_at: string
}
