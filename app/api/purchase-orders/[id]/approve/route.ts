import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 현재 사용자 조회
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // PO 승인
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      status: 'Approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('status', 'Draft') // Draft 상태만 승인 가능

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
