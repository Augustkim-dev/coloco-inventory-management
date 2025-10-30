'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Product } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface AddSupplierProductDialogProps {
  supplierId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSupplierProductDialog({
  supplierId,
  open,
  onOpenChange,
}: AddSupplierProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState({
    product_id: '',
    supplier_product_code: '',
    unit_price: '',
    lead_time_days: '7',
    minimum_order_qty: '1',
    is_primary_supplier: false,
    is_active: true,
  })

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch available products (not yet linked to this supplier)
  useEffect(() => {
    if (open) {
      fetchAvailableProducts()
    }
  }, [open])

  const fetchAvailableProducts = async () => {
    try {
      // Get all products
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (productsError) throw productsError

      // Get products already linked to this supplier
      const { data: linkedProducts, error: linkedError } = await supabase
        .from('supplier_products')
        .select('product_id')
        .eq('supplier_id', supplierId)

      if (linkedError) throw linkedError

      const linkedProductIds = new Set(
        linkedProducts?.map((sp) => sp.product_id) || []
      )

      // Filter out already linked products
      const available = allProducts?.filter(
        (p) => !linkedProductIds.has(p.id)
      ) || []

      setProducts(available)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch products',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('supplier_products').insert({
        supplier_id: supplierId,
        product_id: formData.product_id,
        supplier_product_code: formData.supplier_product_code || null,
        unit_price: formData.unit_price ? Number(formData.unit_price) : null,
        lead_time_days: Number(formData.lead_time_days),
        minimum_order_qty: Number(formData.minimum_order_qty),
        is_primary_supplier: formData.is_primary_supplier,
        is_active: formData.is_active,
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product added to supplier',
      })

      // Reset form
      setFormData({
        product_id: '',
        supplier_product_code: '',
        unit_price: '',
        lead_time_days: '7',
        minimum_order_qty: '1',
        is_primary_supplier: false,
        is_active: true,
      })

      onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product to Supplier</DialogTitle>
          <DialogDescription>
            Configure pricing and terms for a new product from this supplier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id">Product *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) =>
                setFormData({ ...formData, product_id: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    No available products
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Product Code */}
          <div className="space-y-2">
            <Label htmlFor="supplier_product_code">
              Supplier Product Code
            </Label>
            <Input
              id="supplier_product_code"
              value={formData.supplier_product_code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplier_product_code: e.target.value,
                })
              }
              placeholder="Supplier's own SKU/code"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Unit Price */}
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (KRW)</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            {/* Minimum Order Quantity */}
            <div className="space-y-2">
              <Label htmlFor="minimum_order_qty">
                Minimum Order Quantity *
              </Label>
              <Input
                id="minimum_order_qty"
                type="number"
                min="1"
                value={formData.minimum_order_qty}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimum_order_qty: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          {/* Lead Time */}
          <div className="space-y-2">
            <Label htmlFor="lead_time_days">Lead Time (Days) *</Label>
            <Input
              id="lead_time_days"
              type="number"
              min="0"
              value={formData.lead_time_days}
              onChange={(e) =>
                setFormData({ ...formData, lead_time_days: e.target.value })
              }
              required
            />
          </div>

          {/* Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_primary_supplier">Primary Supplier</Label>
                <p className="text-sm text-gray-500">
                  Mark as preferred supplier for this product
                </p>
              </div>
              <Switch
                id="is_primary_supplier"
                checked={formData.is_primary_supplier}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary_supplier: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-sm text-gray-500">
                  Can currently order from this supplier
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
