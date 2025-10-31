import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from_currency = searchParams.get('from')
  const to_currency = searchParams.get('to')

  if (!from_currency || !to_currency) {
    return NextResponse.json(
      { error: 'Missing from or to currency parameter' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // 현재 날짜 이전의 환율 중 가장 최근 것 조회
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('from_currency', from_currency)
    .eq('to_currency', to_currency)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return NextResponse.json(
        { error: `No exchange rate found for ${from_currency} → ${to_currency}` },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rate: data.rate })
}
