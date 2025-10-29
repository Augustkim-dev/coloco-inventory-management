import { createClient } from '@/lib/supabase/server'
import { POForm } from '@/components/purchase-orders/po-form'
import { redirect } from 'next/navigation'

export default async function NewPOPage() {
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

  // 공급업체 및 제품 목록 조회
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .order('name')

  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, unit')
    .order('sku')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Purchase Order</h1>
      <POForm suppliers={suppliers || []} products={products || []} mode="create" />
    </div>
  )
}
