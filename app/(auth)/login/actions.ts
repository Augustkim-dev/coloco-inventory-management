'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('[LOGIN] Attempting login for:', data.email)

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.log('[LOGIN] Error:', error.message)
    return { error: error.message }
  }

  console.log('[LOGIN] Success! User ID:', authData.user?.id)
  console.log('[LOGIN] Session:', authData.session ? 'exists' : 'missing')

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
