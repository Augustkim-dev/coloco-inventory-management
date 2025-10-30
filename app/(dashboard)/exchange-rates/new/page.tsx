import { createClient } from '@/lib/supabase/server'
import { ExchangeRateForm } from '@/components/exchange-rates/exchange-rate-form'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewExchangeRatePage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 사용자 권한 확인 (HQ_Admin만 접근 가능)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/exchange-rates">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Exchange Rates
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Add Exchange Rate</h1>
        <p className="text-gray-500 mt-2">
          Enter a new exchange rate for currency conversion
        </p>
      </div>

      {/* Form */}
      <ExchangeRateForm />
    </div>
  )
}
