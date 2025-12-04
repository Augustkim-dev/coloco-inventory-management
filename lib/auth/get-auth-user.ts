import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached auth user getter using React's cache() function.
 * This ensures that within a single request, auth.getUser() is only called once
 * even if multiple components need the user data.
 *
 * The cache is automatically invalidated between requests.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('[getAuthUser] Auth error:', error.message)
    return null
  }

  return user
})
