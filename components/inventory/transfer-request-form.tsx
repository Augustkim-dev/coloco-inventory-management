'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Location, Product } from '@/types'

interface TransferRequestFormProps {
  userLocationId: string
  parentLocation: Location | null
  allProducts: Product[]
}

export function TransferRequestForm({
  userLocationId,
  parentLocation,
  allProducts
}: TransferRequestFormProps) {
  const [formData, setFormData] = useState({
    product_id: '',
    requested_qty: 1,
    notes: '',
  })
  const [parentStock, setParentStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingStock, setCheckingStock] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Check available stock at parent location for selected product
  const checkParentStock = async (productId: string) => {
    if (!parentLocation || !productId) return

    setCheckingStock(true)
    try {
      const { data, error } = await supabase.rpc('get_available_stock', {
        p_location_id: parentLocation.id,
        p_product_id: productId,
      })

      if (error) throw error

      setParentStock(data || 0)
    } catch (error: any) {
      console.error('Error checking stock:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to check parent location stock',
      })
      setParentStock(0)
    } finally {
      setCheckingStock(false)
    }
  }

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    checkParentStock(productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!parentLocation) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Parent location not found',
      })
      return
    }

    // Validation
    if (!formData.product_id || formData.requested_qty <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill all required fields correctly',
      })
      return
    }

    if (parentStock !== null && formData.requested_qty > parentStock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Stock',
        description: `Only ${parentStock} units available at ${parentLocation.name}`,
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/inventory/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location_id: parentLocation.id,
          to_location_id: userLocationId,
          product_id: formData.product_id,
          requested_qty: formData.requested_qty,
          notes: formData.notes || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Request creation failed')
      }

      toast({
        title: 'Success',
        description: 'Transfer request submitted successfully',
      })

      router.push('/transfer-requests')
      router.refresh()
    } catch (error: any) {
      console.error('Request error:', error)
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = allProducts.find((p) => p.id === formData.product_id)

  if (!parentLocation) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Request Stock Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cannot create transfer request: Parent location not found.
              Please contact your administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Request Stock Transfer</CardTitle>
        <CardDescription>
          Request inventory from {parentLocation.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your request will be sent to the {parentLocation.name} manager for approval.
              Once approved, stock will be transferred to your location.
            </AlertDescription>
          </Alert>

          {/* Product */}
          <div className="space-y-2">
            <Label htmlFor="product_id">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
            >
              <SelectTrigger id="product_id">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {allProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {checkingStock && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking stock at {parentLocation.name}...
              </p>
            )}
            {!checkingStock && parentStock !== null && (
              <p
                className={`text-sm ${
                  parentStock > 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                Available at {parentLocation.name}: {parentStock.toLocaleString()}{' '}
                {selectedProduct?.unit || 'units'}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="requested_qty">
              Requested Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="requested_qty"
              type="number"
              min="1"
              max={parentStock || undefined}
              value={formData.requested_qty}
              onChange={(e) =>
                setFormData({ ...formData, requested_qty: parseInt(e.target.value) || 1 })
              }
              placeholder="Enter quantity"
              disabled={!formData.product_id || parentStock === 0}
              required
            />
            {selectedProduct && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Unit: {selectedProduct.unit}</p>
                {parentStock !== null && (
                  <p className="text-xs">
                    Maximum: {parentStock.toLocaleString()} {selectedProduct.unit}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any notes for the approver..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || parentStock === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Submitting...' : 'Submit Request'}
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
