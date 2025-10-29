import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { items } = await request.json()

  try {
    // stock_batches 생성
    const { error: batchError } = await supabase.from('stock_batches').insert(items)

    if (batchError) throw batchError

    // PO 상태 업데이트
    const { error: poError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'Received',
        received_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (poError) throw poError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
