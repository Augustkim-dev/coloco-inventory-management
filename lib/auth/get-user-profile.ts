import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from './get-auth-user'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'HQ_Admin' | 'Branch_Manager'
  location_id: string | null
  preferred_language: string
}

/**
 * Cached user profile getter using React's cache() function.
 * This fetches the user's profile from the users table only once per request,
 * and reuses the cached auth user from getAuthUser().
 *
 * Returns null if user is not authenticated or profile doesn't exist.
 */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, location_id, preferred_language')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[getUserProfile] Database error:', error.message)
    return null
  }

  // Ensure preferred_language has a default value
  return {
    ...data,
    preferred_language: data.preferred_language || 'en'
  } as UserProfile
})
