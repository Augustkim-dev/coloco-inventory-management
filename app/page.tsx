import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 인증된 사용자는 대시보드로, 아니면 로그인 페이지로
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
