import { createClient } from '@/lib/supabase/server'
import { ReceiveForm } from '@/components/purchase-orders/receive-form'
import { notFound, redirect } from 'next/navigation'

export default async function ReceivePOPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자 정보 조회 (역할 확인)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // HQ Admin만 접근 가능
  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // PO 및 아이템 조회
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(name),
      items:purchase_order_items(
        *,
        product:products(id, sku, name, unit, shelf_life_days)
      )
    `)
    .eq('id', params.id)
    .eq('status', 'Approved')
    .single()

  if (error || !po) {
    notFound()
  }

  // HQ 지사 ID 조회
  const { data: hqLocation } = await supabase
    .from('locations')
    .select('id')
    .eq('location_type', 'HQ')
    .single()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Receive Purchase Order</h1>
      <ReceiveForm po={po} hqLocationId={hqLocation?.id || ''} />
    </div>
  )
}
