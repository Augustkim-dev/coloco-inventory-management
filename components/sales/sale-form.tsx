'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Currency } from '@/types'

interface SaleFormProps {
  location: {
    id: string
    name: string
    currency: Currency
  }
  products: Array<{
    id: string
    sku: string
    name: string
    unit: string
  }>
}

interface PricingInfo {
  unit_price: number
  available_stock: number
}

export function SaleForm({ location, products }: SaleFormProps) {
  const [formData, setFormData] = useState({
    product_id: '',
    qty: 1,
    sale_date: new Date().toISOString().split('T')[0],
  })
  const [pricing, setPricing] = useState<PricingInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch price and available stock when product is selected
  const handleProductChange = async (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    setPricing(null)
    setLoadingPrice(true)

    try {
      // Fetch available stock first (always needed)
      const { data: stockData, error: stockError } = await supabase
        .from('stock_batches')
        .select('qty_on_hand')
        .eq('location_id', location.id)
        .eq('product_id', productId)
        .eq('quality_status', 'OK')
        .gt('qty_on_hand', 0)

      if (stockError) {
        console.error('Error fetching stock:', stockError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch stock information',
        })
        setLoadingPrice(false)
        return
      }

      const availableStock = stockData?.reduce((sum, batch) => sum + batch.qty_on_hand, 0) || 0

      console.log('Available stock for product:', productId, '=', availableStock)

      // Fetch pricing configuration
      const { data: priceData, error: priceError } = await supabase
        .from('pricing_configs')
        .select('final_price')
        .eq('product_id', productId)
        .eq('to_location_id', location.id)
        .maybeSingle()

      if (priceError) {
        console.error('Error fetching price:', priceError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Failed to fetch pricing: ${priceError.message}`,
        })
        setLoadingPrice(false)
        return
      }

      console.log('Price data:', priceData)

      if (!priceData) {
        toast({
          variant: 'destructive',
          title: 'No pricing configuration',
          description: 'Please contact HQ Admin to set up pricing for this product.',
        })
        setLoadingPrice(false)
        return
      }

      if (availableStock === 0) {
        toast({
          variant: 'destructive',
          title: 'No stock available',
          description: 'This product is currently out of stock.',
        })
        setLoadingPrice(false)
        return
      }

      setPricing({
        unit_price: priceData.final_price,
        available_stock: availableStock,
      })
    } catch (error: any) {
      console.error('Unexpected error in handleProductChange:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
      })
    } finally {
      setLoadingPrice(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id || !pricing) {
      toast({ variant: 'destructive', title: 'Please select a product' })
      return
    }

    if (formData.qty <= 0) {
      toast({ variant: 'destructive', title: 'Quantity must be greater than 0' })
      return
    }

    if (formData.qty > pricing.available_stock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient stock',
        description: `Available: ${pricing.available_stock} units`,
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: location.id,
          product_id: formData.product_id,
          qty: formData.qty,
          unit_price: pricing.unit_price,
          currency: location.currency,
          sale_date: formData.sale_date,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add sale')
      }

      toast({
        title: 'Sale added successfully',
        description: result.message || 'The sale has been recorded.',
      })
      router.push('/sales')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = pricing ? formData.qty * pricing.unit_price : 0
  const selectedProduct = products.find(p => p.id === formData.product_id)

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add Sale - {location.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sale_date">Sale Date *</Label>
            <Input
              id="sale_date"
              type="date"
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="product_id">Product *</Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
              disabled={loadingPrice}
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
            {loadingPrice && (
              <p className="text-sm text-gray-500 mt-1">Loading pricing and stock...</p>
            )}
            {pricing && !loadingPrice && (
              <p className="text-sm text-green-600 mt-1">
                Available stock: {pricing.available_stock} {selectedProduct?.unit}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="qty">Quantity *</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              max={pricing?.available_stock || undefined}
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
              disabled={!pricing || loadingPrice}
              required
            />
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-1">Unit: {selectedProduct.unit}</p>
            )}
          </div>

          {pricing && !loadingPrice && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Unit Price:</span>
                <span className="font-semibold">{formatCurrency(pricing.unit_price, location.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Quantity:</span>
                <span className="font-semibold">{formData.qty} {selectedProduct?.unit}</span>
              </div>
              <div className="h-px bg-green-300 my-2"></div>
              <div className="flex justify-between text-lg">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold text-green-700">{formatCurrency(totalAmount, location.currency)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !pricing || loadingPrice}>
              {loading ? 'Adding...' : 'Add Sale'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
