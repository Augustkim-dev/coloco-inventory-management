import { createClient } from '@/lib/supabase/server'
import { POList } from '@/components/purchase-orders/po-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function PurchaseOrdersPage() {
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

  const { data: purchaseOrders, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(name),
      items:purchase_order_items(
        id,
        qty,
        unit_price,
        total_price,
        product:products(name, sku)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error loading purchase orders: {error.message}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Link href="/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </Link>
      </div>

      <POList purchaseOrders={purchaseOrders || []} />
    </div>
  )
}
