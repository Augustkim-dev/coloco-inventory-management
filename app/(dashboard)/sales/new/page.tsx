import { createClient } from '@/lib/supabase/server'
import { SaleForm } from '@/components/sales/sale-form'
import { redirect } from 'next/navigation'
import { Currency } from '@/types'
import { getServerTranslations, getCommonTranslations } from '@/lib/i18n/server-translations'

export default async function NewSalePage() {
  const t = await getServerTranslations('sales')
  const tCommon = await getCommonTranslations()
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select(`
      role,
      location_id,
      location:locations(id, name, currency)
    `)
    .eq('id', user.id)
    .single()

  // Only Branch Manager can access this page
  if (profile?.role !== 'Branch_Manager') {
    redirect('/dashboard')
  }

  if (!profile.location || Array.isArray(profile.location)) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Error: No location assigned to your account. Please contact HQ Admin.
        </div>
      </div>
    )
  }

  // Type assertion for location
  const location = profile.location as { id: string; name: string; currency: Currency }

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name, unit')
    .order('sku')

  if (productsError) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          {tCommon.messages.loadError}: {productsError.message}
        </div>
      </div>
    )
  }

  // Fetch stock data for current location
  const { data: stockData } = await supabase
    .from('stock_batches')
    .select('product_id, qty_on_hand')
    .eq('location_id', location.id)
    .eq('quality_status', 'OK')
    .gt('qty_on_hand', 0)

  // Combine products with stock information
  const productsWithStock = (products || []).map(product => ({
    ...product,
    available_stock: stockData
      ?.filter(s => s.product_id === product.id)
      .reduce((sum, s) => sum + s.qty_on_hand, 0) || 0
  }))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.addSale}</h1>
        <p className="text-gray-600 mt-1">Record a new sale for your location</p>
      </div>
      <SaleForm
        location={location}
        products={productsWithStock}
      />
    </div>
  )
}
