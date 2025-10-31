import { createClient } from '@/lib/supabase/server'
import { ExchangeRatesList } from '@/components/exchange-rates/exchange-rates-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getServerTranslations } from '@/lib/i18n/server-translations'

export default async function ExchangeRatesPage() {
  const t = await getServerTranslations('exchangeRates')
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

  // 환율 데이터 조회
  const { data: exchangeRates, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('effective_date', { ascending: false })
    .order('from_currency')

  if (error) {
    console.error('Error fetching exchange rates:', error)
    return <div>{t.messages.loadError}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-500 mt-2">
            Manage exchange rates for currency conversions in pricing
            calculations
          </p>
        </div>
        <Link href="/exchange-rates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.addRate}
          </Button>
        </Link>
      </div>

      {/* Exchange Rates List */}
      <ExchangeRatesList exchangeRates={exchangeRates || []} />
    </div>
  )
}
