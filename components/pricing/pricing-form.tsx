'use client'

import { useState, useEffect, useMemo } from 'react'
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

interface LocationWithHierarchy {
  id: string
  name: string
  country_code: string
  currency: string
  location_type: string
  parent_id: string | null
  level: number
}

interface PricingFormProps {
  hqLocation: any
  branches: LocationWithHierarchy[]
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
    sub_branch_margin_percent:
      existingConfig?.sub_branch_margin_percent?.toString() || '0',
    discount_percent: existingConfig?.discount_percent?.toString() || '0',
    exchange_rate: existingConfig?.exchange_rate?.toString() || '',
    calculated_price: existingConfig?.calculated_price?.toString() || '',
    final_price: existingConfig?.final_price?.toString() || '',
    discounted_price: existingConfig?.discounted_price?.toString() || '',
  })

  // 2단계 선택을 위한 상태
  const [selectedMainBranchId, setSelectedMainBranchId] = useState<string>('')
  const [selectedSubBranchId, setSelectedSubBranchId] = useState<string>('')

  const [selectedLocation, setSelectedLocation] = useState<LocationWithHierarchy | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Main Branches (level 2, location_type = 'Branch')
  const mainBranches = useMemo(() => {
    return branches.filter(
      (b) => b.location_type === 'Branch' && b.level === 2
    )
  }, [branches])

  // Sub Branches for selected main branch
  const subBranches = useMemo(() => {
    if (!selectedMainBranchId) return []
    return branches.filter(
      (b) => b.parent_id === selectedMainBranchId && b.location_type === 'SubBranch'
    )
  }, [branches, selectedMainBranchId])

  // edit 모드에서 기존 설정 로드
  useEffect(() => {
    if (mode === 'edit' && existingConfig?.to_location_id) {
      const targetLocation = branches.find(
        (b) => b.id === existingConfig.to_location_id
      )
      if (targetLocation) {
        if (targetLocation.location_type === 'SubBranch') {
          // SubBranch인 경우
          setSelectedMainBranchId(targetLocation.parent_id || '')
          setSelectedSubBranchId(targetLocation.id)
        } else {
          // Main Branch인 경우
          setSelectedMainBranchId(targetLocation.id)
          setSelectedSubBranchId('')
        }
      }
    }
  }, [mode, existingConfig, branches])

  // 선택된 location 업데이트
  useEffect(() => {
    // Sub Branch가 선택되었으면 그것을 사용, 아니면 Main Branch 사용
    const targetId = selectedSubBranchId || selectedMainBranchId
    const location = branches.find((b) => b.id === targetId)
    setSelectedLocation(location || null)

    if (targetId) {
      setFormData((prev) => ({
        ...prev,
        to_location_id: targetId,
      }))
    }
  }, [selectedMainBranchId, selectedSubBranchId, branches])

  // Sub Branch 선택 시 Sub Branch Margin 필드 표시 여부
  const showSubBranchMargin = useMemo(() => {
    return selectedSubBranchId !== '' && selectedSubBranchId !== 'none'
  }, [selectedSubBranchId])

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

  const handleMainBranchChange = (branchId: string) => {
    setSelectedMainBranchId(branchId)
    setSelectedSubBranchId('') // Sub Branch 선택 초기화
    // Sub Branch Margin 초기화
    setFormData((prev) => ({
      ...prev,
      sub_branch_margin_percent: '0',
    }))
  }

  const handleSubBranchChange = (subBranchId: string) => {
    if (subBranchId === 'none') {
      setSelectedSubBranchId('')
      setFormData((prev) => ({
        ...prev,
        sub_branch_margin_percent: '0',
      }))
    } else {
      setSelectedSubBranchId(subBranchId)
    }
  }

  const calculatePrice = () => {
    const {
      purchase_price,
      transfer_cost,
      hq_margin_percent,
      branch_margin_percent,
      sub_branch_margin_percent,
      discount_percent,
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
    const subBranchMargin = showSubBranchMargin
      ? parseFloat(sub_branch_margin_percent || '0')
      : 0
    const discountPct = parseFloat(discount_percent || '0')
    const rate = parseFloat(exchange_rate)

    // Validate total margin
    const totalMargin = hqMargin + branchMargin + subBranchMargin
    if (totalMargin >= 100) {
      toast({
        variant: 'destructive',
        title: 'Invalid margins',
        description:
          'Total margin (HQ + Branch + SubBranch) must be less than 100%. Currently: ' +
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

    // STEP 2: Calculate selling price (소비자가격)
    const marginFactor = 1 - totalMargin / 100
    const sellingPrice = localCost / marginFactor

    // STEP 3: Round price based on currency
    let roundedPrice: number
    const currency = selectedLocation?.currency || 'VND'
    if (currency === 'CNY') {
      roundedPrice = Math.round(sellingPrice * 100) / 100
    } else if (currency === 'VND') {
      roundedPrice = Math.round(sellingPrice / 1000) * 1000
    } else {
      // KRW
      roundedPrice = Math.round(sellingPrice / 100) * 100
    }

    // STEP 4: Calculate discounted price (할인판매가격)
    let discountedPrice = roundedPrice * (1 - discountPct / 100)
    // Round discounted price too
    if (currency === 'CNY') {
      discountedPrice = Math.round(discountedPrice * 100) / 100
    } else if (currency === 'VND') {
      discountedPrice = Math.round(discountedPrice / 1000) * 1000
    } else {
      discountedPrice = Math.round(discountedPrice / 100) * 100
    }

    setFormData((prev) => ({
      ...prev,
      calculated_price: sellingPrice.toFixed(2),
      final_price: roundedPrice.toString(),
      discounted_price: discountedPrice.toString(),
    }))

    toast({
      title: 'Price calculated successfully',
      description: `Consumer Price: ${formatCurrency(
        roundedPrice,
        currency as Currency
      )}, Discounted: ${formatCurrency(discountedPrice, currency as Currency)}`,
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
      const subBranchMargin = showSubBranchMargin
        ? parseFloat(formData.sub_branch_margin_percent || '0')
        : 0

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
        sub_branch_margin_percent: subBranchMargin,
        discount_percent: parseFloat(formData.discount_percent || '0'),
        exchange_rate: parseFloat(formData.exchange_rate),
        calculated_price: parseFloat(formData.calculated_price),
        final_price: parseFloat(formData.final_price),
        discounted_price: parseFloat(formData.discounted_price || formData.final_price),
        currency: selectedLocation?.currency,
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

  // 총 마진 계산
  const totalMargin =
    parseFloat(formData.hq_margin_percent || '0') +
    parseFloat(formData.branch_margin_percent || '0') +
    (showSubBranchMargin
      ? parseFloat(formData.sub_branch_margin_percent || '0')
      : 0)

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
          {/* 제품 선택 */}
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

          {/* 2단계 지사 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="main_branch">Main Branch *</Label>
              <Select
                value={selectedMainBranchId}
                onValueChange={handleMainBranchChange}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select main branch" />
                </SelectTrigger>
                <SelectContent>
                  {mainBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.country_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sub_branch">Sub Branch (Optional)</Label>
              <Select
                value={selectedSubBranchId || 'none'}
                onValueChange={handleSubBranchChange}
                disabled={mode === 'edit' || !selectedMainBranchId || subBranches.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No Sub Branch (Apply to Main Branch)
                  </SelectItem>
                  {subBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMainBranchId && subBranches.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No sub branches available for this main branch
                </p>
              )}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Margin Settings</h3>
              <span
                className={`text-sm ${
                  totalMargin >= 100 ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                Total Margin: {totalMargin.toFixed(2)}%
                {totalMargin >= 100 && ' (must be less than 100%)'}
              </span>
            </div>
            <div
              className={`grid gap-4 ${
                showSubBranchMargin
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
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
              {showSubBranchMargin && (
                <div>
                  <Label htmlFor="sub_branch_margin_percent">
                    Sub Branch Margin (%)
                  </Label>
                  <Input
                    id="sub_branch_margin_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="99"
                    value={formData.sub_branch_margin_percent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sub_branch_margin_percent: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* 할인율 입력 */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Discount Settings</h3>
            <div className="max-w-xs">
              <Label htmlFor="discount_percent">Discount (%)</Label>
              <Input
                id="discount_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_percent: e.target.value,
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Applied to final consumer price
              </p>
            </div>
          </div>

          {/* 환율 */}
          {selectedLocation && (
            <ExchangeRateSelector
              fromCurrency="KRW"
              toCurrency={selectedLocation.currency as Currency}
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
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Calculated Price (Auto)</Label>
                  <Input
                    value={`${parseFloat(
                      formData.calculated_price
                    ).toLocaleString()} ${selectedLocation?.currency}`}
                    disabled
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    System calculated price
                  </p>
                </div>
                <div>
                  <Label htmlFor="final_price">Consumer Price (Adjustable) *</Label>
                  <Input
                    id="final_price"
                    type="number"
                    step={selectedLocation?.currency === 'CNY' ? '0.01' : '1'}
                    min="0"
                    value={formData.final_price}
                    onChange={(e) => {
                      const newFinalPrice = parseFloat(e.target.value || '0')
                      const discountPct = parseFloat(
                        formData.discount_percent || '0'
                      )
                      let discounted =
                        newFinalPrice * (1 - discountPct / 100)
                      // Round
                      const currency = selectedLocation?.currency || 'VND'
                      if (currency === 'CNY') {
                        discounted = Math.round(discounted * 100) / 100
                      } else if (currency === 'VND') {
                        discounted = Math.round(discounted / 1000) * 1000
                      } else {
                        discounted = Math.round(discounted / 100) * 100
                      }
                      setFormData({
                        ...formData,
                        final_price: e.target.value,
                        discounted_price: discounted.toString(),
                      })
                    }}
                    required
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can adjust the consumer price
                  </p>
                </div>
                <div>
                  <Label>Discounted Price</Label>
                  <Input
                    value={`${parseFloat(
                      formData.discounted_price || formData.final_price
                    ).toLocaleString()} ${selectedLocation?.currency}`}
                    disabled
                    className="bg-white font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {parseFloat(formData.discount_percent || '0') > 0
                      ? `${formData.discount_percent}% discount applied`
                      : 'No discount'}
                  </p>
                </div>
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
