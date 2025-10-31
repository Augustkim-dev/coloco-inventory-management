import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductsList } from '@/components/products/products-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getServerTranslations, getCommonTranslations } from '@/lib/i18n/server-translations'

export default async function ProductsPage() {
  const t = await getServerTranslations('products')
  const tCommon = await getCommonTranslations()
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>{tCommon.messages.loadError}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-500 mt-2">Manage product catalog and information</p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.addProduct}
          </Button>
        </Link>
      </div>

      <ProductsList products={products || []} />
    </div>
  )
}
