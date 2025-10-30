'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface TransferFormProps {
  hqLocationId: string
  branches: Array<{
    id: string
    name: string
    country_code: string
  }>
  products: Array<{
    id: string
    sku: string
    name: string
    unit: string
  }>
}

export function TransferForm({ hqLocationId, branches, products }: TransferFormProps) {
  const [formData, setFormData] = useState({
    to_location_id: '',
    product_id: '',
    qty: 1,
  })
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingStock, setCheckingStock] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Check available stock at HQ for selected product
  const checkAvailableStock = async (productId: string) => {
    setCheckingStock(true)
    try {
      const { data, error } = await supabase.rpc('get_available_stock', {
        p_location_id: hqLocationId,
        p_product_id: productId,
      })

      if (error) throw error

      setAvailableStock(data || 0)
    } catch (error: any) {
      console.error('Error checking stock:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to check available stock',
      })
      setAvailableStock(0)
    } finally {
      setCheckingStock(false)
    }
  }

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    checkAvailableStock(productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.to_location_id || !formData.product_id || formData.qty <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill all fields correctly',
      })
      return
    }

    if (availableStock !== null && formData.qty > availableStock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Stock',
        description: `Only ${availableStock} units available at HQ`,
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location_id: hqLocationId,
          to_location_id: formData.to_location_id,
          product_id: formData.product_id,
          qty: formData.qty,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed')
      }

      toast({
        title: 'Success',
        description: `Stock transferred successfully using ${result.deductions?.length || 0} batch(es)`,
      })

      router.push('/inventory')
      router.refresh()
    } catch (error: any) {
      console.error('Transfer error:', error)
      toast({
        variant: 'destructive',
        title: 'Transfer Failed',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === formData.product_id)

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Transfer Stock from HQ to Branch</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="to_location_id">
              Destination Branch <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.to_location_id}
              onValueChange={(value) =>
                setFormData({ ...formData, to_location_id: value })
              }
            >
              <SelectTrigger id="to_location_id">
                <SelectValue placeholder="Select destination branch" />
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

          <div className="space-y-2">
            <Label htmlFor="product_id">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.product_id} onValueChange={handleProductChange}>
              <SelectTrigger id="product_id">
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
            {checkingStock && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking available stock...
              </p>
            )}
            {!checkingStock && availableStock !== null && (
              <p
                className={`text-sm ${
                  availableStock > 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                Available at HQ: {availableStock.toLocaleString()}{' '}
                {selectedProduct?.unit || 'units'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qty"
              type="number"
              min="1"
              max={availableStock || undefined}
              value={formData.qty}
              onChange={(e) =>
                setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })
              }
              placeholder="Enter quantity"
              disabled={!formData.product_id || availableStock === 0}
              required
            />
            {selectedProduct && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Unit: {selectedProduct.unit}</p>
                {availableStock !== null && (
                  <p className="text-xs">
                    Maximum: {availableStock.toLocaleString()} {selectedProduct.unit}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || availableStock === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Transferring...' : 'Transfer Stock'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
