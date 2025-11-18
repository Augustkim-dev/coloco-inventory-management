import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PricingList } from '@/components/pricing/pricing-list'
import { PricingChainView } from '@/components/pricing/pricing-chain-view'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, List, TrendingUp } from 'lucide-react'
import { getServerTranslations } from '@/lib/i18n/server-translations'

export default async function PricingPage() {
  const t = await getServerTranslations('pricing')
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: pricingConfigs, error } = await supabase
    .from('pricing_configs')
    .select(
      `
      *,
      product:products!inner(sku, name),
      to_location:locations!pricing_configs_to_location_id_fkey(name, country_code, currency, display_order)
    `
    )
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error loading pricing configs:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">{t.messages.loadError}</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  // Fetch products and locations for chain view
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sku', { ascending: true })

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('path', { ascending: true })

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-gray-600 mt-1">
            Manage selling prices and view cascading price chains
          </p>
        </div>
        <Link href="/pricing/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.addConfig}
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Pricing Configs
          </TabsTrigger>
          <TabsTrigger value="chain" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Price Chain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <PricingList pricingConfigs={pricingConfigs || []} />
        </TabsContent>

        <TabsContent value="chain" className="space-y-6">
          <PricingChainView
            products={products || []}
            locations={locations || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
