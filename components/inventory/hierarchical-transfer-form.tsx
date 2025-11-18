'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Location, Product, UserRole } from '@/types'
import { getValidTransferDestinations, getIndentedName, sortByPath } from '@/lib/hierarchy-utils'

interface HierarchicalTransferFormProps {
  userRole: UserRole
  userLocationId: string | null
  allLocations: Location[]
  products: Product[]
}

export function HierarchicalTransferForm({
  userRole,
  userLocationId,
  allLocations,
  products
}: HierarchicalTransferFormProps) {
  const [formData, setFormData] = useState({
    from_location_id: '',
    to_location_id: '',
    product_id: '',
    qty: 1,
  })
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingStock, setCheckingStock] = useState(false)
  const [validDestinations, setValidDestinations] = useState<Location[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Get accessible source locations
  const accessibleLocations = userRole === 'HQ_Admin'
    ? allLocations
    : userLocationId
      ? allLocations.filter(loc => {
          if (loc.id === userLocationId) return true
          // Branch Manager can transfer from their location
          return false
        })
      : []

  // Update valid destinations when source changes
  useEffect(() => {
    if (formData.from_location_id) {
      const destinations = getValidTransferDestinations(
        formData.from_location_id,
        userLocationId,
        userRole,
        allLocations
      )
      setValidDestinations(sortByPath(destinations))

      // Reset destination if it's no longer valid
      if (formData.to_location_id && !destinations.some(d => d.id === formData.to_location_id)) {
        setFormData(prev => ({ ...prev, to_location_id: '' }))
      }
    } else {
      setValidDestinations([])
    }
  }, [formData.from_location_id, allLocations, userLocationId, userRole])

  // Check available stock at source location for selected product
  const checkAvailableStock = async (sourceLocationId: string, productId: string) => {
    if (!sourceLocationId || !productId) return

    setCheckingStock(true)
    try {
      const { data, error } = await supabase.rpc('get_available_stock', {
        p_location_id: sourceLocationId,
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

  const handleSourceChange = (locationId: string) => {
    setFormData({ ...formData, from_location_id: locationId, to_location_id: '' })
    setAvailableStock(null)
    if (formData.product_id) {
      checkAvailableStock(locationId, formData.product_id)
    }
  }

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    if (formData.from_location_id) {
      checkAvailableStock(formData.from_location_id, productId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.from_location_id || !formData.to_location_id || !formData.product_id || formData.qty <= 0) {
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
        description: `Only ${availableStock} units available at source location`,
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location_id: formData.from_location_id,
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
  const sourceLocation = allLocations.find(loc => loc.id === formData.from_location_id)
  const destLocation = allLocations.find(loc => loc.id === formData.to_location_id)

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Transfer Stock Between Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Transfers are only allowed between direct parent and child locations.
              {userRole === 'Branch_Manager' && ' You can transfer from your branch to sub-branches.'}
            </AlertDescription>
          </Alert>

          {/* Source Location */}
          <div className="space-y-2">
            <Label htmlFor="from_location_id">
              Source Location <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.from_location_id}
              onValueChange={handleSourceChange}
            >
              <SelectTrigger id="from_location_id">
                <SelectValue placeholder="Select source location" />
              </SelectTrigger>
              <SelectContent>
                {sortByPath(accessibleLocations).map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {getIndentedName(location)} ({location.location_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination Location */}
          <div className="space-y-2">
            <Label htmlFor="to_location_id">
              Destination Location <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.to_location_id}
              onValueChange={(value) =>
                setFormData({ ...formData, to_location_id: value })
              }
              disabled={!formData.from_location_id}
            >
              <SelectTrigger id="to_location_id">
                <SelectValue placeholder={
                  formData.from_location_id
                    ? "Select destination location"
                    : "Select source location first"
                } />
              </SelectTrigger>
              <SelectContent>
                {validDestinations.length === 0 && formData.from_location_id && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No valid destinations for this source
                  </div>
                )}
                {validDestinations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {getIndentedName(location)} ({location.location_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.from_location_id && formData.to_location_id && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{sourceLocation?.name}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{destLocation?.name}</span>
              </div>
            )}
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label htmlFor="product_id">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
              disabled={!formData.from_location_id}
            >
              <SelectTrigger id="product_id">
                <SelectValue placeholder={
                  formData.from_location_id
                    ? "Select product"
                    : "Select source location first"
                } />
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
                Available at {sourceLocation?.name}: {availableStock.toLocaleString()}{' '}
                {selectedProduct?.unit || 'units'}
              </p>
            )}
          </div>

          {/* Quantity */}
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

          {/* Actions */}
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
