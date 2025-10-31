import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuppliersList } from '@/components/suppliers/suppliers-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getServerTranslations } from '@/lib/i18n/server-translations'

export default async function SuppliersPage() {
  const t = await getServerTranslations('suppliers')
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

  // Fetch suppliers
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>{t.messages.loadError}: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-500 mt-2">Manage factory and supplier information</p>
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.addSupplier}
          </Button>
        </Link>
      </div>

      <SuppliersList suppliers={suppliers || []} />
    </div>
  )
}
