'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ExchangeRateSelector } from '@/components/exchange-rates/exchange-rate-selector'
import { Calculator, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface PricingFormProps {
  hqLocation: any
  branches: Array<{
    id: string
    name: string
    country_code: string
    currency: string
  }>
  products: Array<{ id: string; sku: string; name: string; unit: string }>
  mode: 'create' | 'edit'
  existingConfig?: any
}

export function PricingForm({
  hqLocation,
  branches,
  products,
  mode,
  existingConfig,
}: PricingFormProps) {
  const [formData, setFormData] = useState({
    product_id: existingConfig?.product_id || '',
    to_location_id: existingConfig?.to_location_id || '',
    purchase_price: existingConfig?.purchase_price?.toString() || '',
    transfer_cost: existingConfig?.transfer_cost?.toString() || '0',
    hq_margin_percent: existingConfig?.hq_margin_percent?.toString() || '10',
    branch_margin_percent:
      existingConfig?.branch_margin_percent?.toString() || '30',
    exchange_rate: existingConfig?.exchange_rate?.toString() || '',
    calculated_price: existingConfig?.calculated_price?.toString() || '',
    final_price: existingConfig?.final_price?.toString() || '',
  })
  const [selectedBranch, setSelectedBranch] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const branch = branches.find((b) => b.id === formData.to_location_id)
    setSelectedBranch(branch || null)
  }, [formData.to_location_id, branches])

  // 최근 PO에서 구매 단가 자동 불러오기
  const fetchLatestPurchasePrice = async (productId: string) => {
    if (!productId) return

    setFetchingPrice(true)
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(
          `
          unit_price,
          purchase_orders!inner(status)
        `
        )
        .eq('product_id', productId)
        .eq('purchase_orders.status', 'Received')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          toast({
            variant: 'destructive',
            title: 'No purchase history',
            description:
              'No received purchase orders found for this product. Please enter the price manually.',
          })
        } else {
          throw error
        }
        return
      }

      if (data) {
        setFormData((prev) => ({
          ...prev,
          purchase_price: data.unit_price.toString(),
        }))
        toast({
          title: 'Purchase price loaded',
          description: `Loaded from recent PO: ${formatCurrency(
            data.unit_price,
            'KRW'
          )}`,
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch purchase price: ' + error.message,
      })
    } finally {
      setFetchingPrice(false)
    }
  }

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    fetchLatestPurchasePrice(productId)
  }

  const calculatePrice = () => {
    const {
      purchase_price,
      transfer_cost,
      hq_margin_percent,
      branch_margin_percent,
      exchange_rate,
    } = formData

    // Validation
    if (!purchase_price || !exchange_rate) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Please enter purchase price and exchange rate',
      })
      return
    }

    const purchasePrice = parseFloat(purchase_price)
    const transferCost = parseFloat(transfer_cost || '0')
    const hqMargin = parseFloat(hq_margin_percent || '0')
    const branchMargin = parseFloat(branch_margin_percent || '0')
    const rate = parseFloat(exchange_rate)

    // Validate total margin
    const totalMargin = hqMargin + branchMargin
    if (totalMargin >= 100) {
      toast({
        variant: 'destructive',
        title: 'Invalid margins',
        description:
          'Total margin (HQ + Branch) must be less than 100%. Currently: ' +
          totalMargin +
          '%',
      })
      return
    }

    if (rate <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid exchange rate',
        description: 'Exchange rate must be greater than 0',
      })
      return
    }

    // STEP 1: Calculate local cost
    const totalCostKRW = purchasePrice + transferCost
    const localCost = totalCostKRW * rate

    // STEP 2: Calculate selling price
    const marginFactor = 1 - totalMargin / 100
    const sellingPrice = localCost / marginFactor

    // STEP 3: Suggest rounded price
    let roundedPrice: number
    if (selectedBranch?.currency === 'CNY') {
      // For CNY, round to 2 decimal places
      roundedPrice = Math.round(sellingPrice * 100) / 100
    } else {
      // For KRW and VND, round to nearest 100
      roundedPrice = Math.round(sellingPrice / 100) * 100
    }

    setFormData((prev) => ({
      ...prev,
      calculated_price: sellingPrice.toFixed(2),
      final_price: roundedPrice.toString(),
    }))

    toast({
      title: 'Price calculated successfully',
      description: `Suggested price: ${formatCurrency(
        roundedPrice,
        selectedBranch?.currency as Currency
      )}`,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.final_price) {
      toast({
        variant: 'destructive',
        title: 'Missing final price',
        description: 'Please calculate the price first',
      })
      return
    }

    setLoading(true)

    try {
      const data = {
        product_id: formData.product_id,
        from_location_id: hqLocation.id,
        to_location_id: formData.to_location_id,
        purchase_price: parseFloat(formData.purchase_price),
        transfer_cost: parseFloat(formData.transfer_cost || '0'),
        hq_margin_percent: parseFloat(formData.hq_margin_percent || '0'),
        branch_margin_percent: parseFloat(
          formData.branch_margin_percent || '0'
        ),
        exchange_rate: parseFloat(formData.exchange_rate),
        calculated_price: parseFloat(formData.calculated_price),
        final_price: parseFloat(formData.final_price),
        currency: selectedBranch?.currency,
      }

      if (mode === 'create') {
        const { error } = await supabase
          .from('pricing_configs')
          .insert([data])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Pricing configuration created successfully',
        })
      } else {
        const { error } = await supabase
          .from('pricing_configs')
          .update(data)
          .eq('id', existingConfig.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Pricing configuration updated successfully',
        })
      }

      router.push('/pricing')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving pricing config:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message || 'Failed to save pricing configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New' : 'Edit'} Pricing Configuration
        </CardTitle>
        <CardDescription>
          Calculate selling price based on purchase price, transfer cost,
          margins, and exchange rate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제품 및 지사 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product_id">Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={handleProductChange}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fetchingPrice && (
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading latest price...
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="to_location_id">Destination Branch *</Label>
              <Select
                value={formData.to_location_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, to_location_id: value })
                }
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.country_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 비용 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase_price">Purchase Price (KRW) *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_price: e.target.value })
                }
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-loaded from recent PO
              </p>
            </div>
            <div>
              <Label htmlFor="transfer_cost">Transfer Cost (KRW)</Label>
              <Input
                id="transfer_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.transfer_cost}
                onChange={(e) =>
                  setFormData({ ...formData, transfer_cost: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Shipping, customs, etc.
              </p>
            </div>
          </div>

          {/* 마진 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hq_margin_percent">HQ Margin (%)</Label>
              <Input
                id="hq_margin_percent"
                type="number"
                step="0.01"
                min="0"
                max="99"
                value={formData.hq_margin_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hq_margin_percent: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="branch_margin_percent">Branch Margin (%)</Label>
              <Input
                id="branch_margin_percent"
                type="number"
                step="0.01"
                min="0"
                max="99"
                value={formData.branch_margin_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branch_margin_percent: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* 환율 */}
          {selectedBranch && (
            <ExchangeRateSelector
              fromCurrency="KRW"
              toCurrency={selectedBranch.currency as Currency}
              value={parseFloat(formData.exchange_rate || '0')}
              onChange={(rate) =>
                setFormData({ ...formData, exchange_rate: rate.toString() })
              }
            />
          )}

          {/* 가격 계산 버튼 */}
          <div className="flex justify-center">
            <Button type="button" onClick={calculatePrice} variant="secondary">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Price
            </Button>
          </div>

          {/* 계산 결과 */}
          {formData.calculated_price && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label>Calculated Price (Auto)</Label>
                <Input
                  value={`${parseFloat(
                    formData.calculated_price
                  ).toLocaleString()} ${selectedBranch?.currency}`}
                  disabled
                  className="bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  System calculated price
                </p>
              </div>
              <div>
                <Label htmlFor="final_price">Final Price (Adjustable) *</Label>
                <Input
                  id="final_price"
                  type="number"
                  step={selectedBranch?.currency === 'CNY' ? '0.01' : '1'}
                  min="0"
                  value={formData.final_price}
                  onChange={(e) =>
                    setFormData({ ...formData, final_price: e.target.value })
                  }
                  required
                  className="bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can adjust the final price
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Pricing'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
