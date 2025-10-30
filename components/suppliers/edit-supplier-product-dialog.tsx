'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { SupplierProduct, Product } from '@/types'
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
import { Switch } from '@/components/ui/switch'

interface EditSupplierProductDialogProps {
  supplierProduct: SupplierProduct & { product: Product }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSupplierProductDialog({
  supplierProduct,
  open,
  onOpenChange,
}: EditSupplierProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_product_code: supplierProduct.supplier_product_code || '',
    unit_price: supplierProduct.unit_price?.toString() || '',
    lead_time_days: supplierProduct.lead_time_days?.toString() || '7',
    minimum_order_qty: supplierProduct.minimum_order_qty?.toString() || '1',
    is_primary_supplier: supplierProduct.is_primary_supplier || false,
    is_active: supplierProduct.is_active ?? true,
  })

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Reset form when dialog opens with new product
  useEffect(() => {
    if (open) {
      setFormData({
        supplier_product_code: supplierProduct.supplier_product_code || '',
        unit_price: supplierProduct.unit_price?.toString() || '',
        lead_time_days: supplierProduct.lead_time_days?.toString() || '7',
        minimum_order_qty:
          supplierProduct.minimum_order_qty?.toString() || '1',
        is_primary_supplier: supplierProduct.is_primary_supplier || false,
        is_active: supplierProduct.is_active ?? true,
      })
    }
  }, [open, supplierProduct])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('supplier_products')
        .update({
          supplier_product_code: formData.supplier_product_code || null,
          unit_price: formData.unit_price ? Number(formData.unit_price) : null,
          lead_time_days: Number(formData.lead_time_days),
          minimum_order_qty: Number(formData.minimum_order_qty),
          is_primary_supplier: formData.is_primary_supplier,
          is_active: formData.is_active,
        })
        .eq('id', supplierProduct.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product information updated',
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
          <DialogTitle>Edit Product Information</DialogTitle>
          <DialogDescription>
            Update pricing and terms for {supplierProduct.product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Product:</span>{' '}
                {supplierProduct.product.name}
              </div>
              <div>
                <span className="font-medium">SKU:</span>{' '}
                {supplierProduct.product.sku}
              </div>
              <div>
                <span className="font-medium">Category:</span>{' '}
                {supplierProduct.product.category}
              </div>
              <div>
                <span className="font-medium">Unit:</span>{' '}
                {supplierProduct.product.unit}
              </div>
            </div>
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
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
