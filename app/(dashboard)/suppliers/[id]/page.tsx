import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SupplierInfo } from '@/components/suppliers/supplier-info'
import { SupplierProductsManager } from '@/components/suppliers/supplier-products-manager'

export default async function SupplierDetailPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Fetch supplier details
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !supplier) {
    notFound()
  }

  // Fetch supplier's products with product details
  const { data: supplierProducts } = await supabase
    .from('supplier_products')
    .select(`
      *,
      product:products (
        id,
        sku,
        name,
        name_ko,
        category,
        unit
      )
    `)
    .eq('supplier_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-gray-500 mt-1">Supplier Details & Products</p>
          </div>
        </div>
        <Link href={`/suppliers/${params.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Supplier
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Supplier Information</TabsTrigger>
          <TabsTrigger value="products">Products & Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <SupplierInfo supplier={supplier} />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <SupplierProductsManager
            supplierId={params.id}
            supplierProducts={supplierProducts || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
