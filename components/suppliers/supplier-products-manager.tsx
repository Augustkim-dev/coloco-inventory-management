'use client'

import { useState } from 'react'
import { SupplierProduct, Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash, Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AddSupplierProductDialog } from './add-supplier-product-dialog'
import { EditSupplierProductDialog } from './edit-supplier-product-dialog'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SupplierProductsManagerProps {
  supplierId: string
  supplierProducts: (SupplierProduct & { product: Product })[]
}

export function SupplierProductsManager({
  supplierId,
  supplierProducts: initialProducts,
}: SupplierProductsManagerProps) {
  const [supplierProducts, setSupplierProducts] = useState(initialProducts)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<
    (SupplierProduct & { product: Product }) | null
  >(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('supplier_products')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product removed from supplier',
      })

      setDeleteId(null)
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products & Pricing ({supplierProducts.length})
            </CardTitle>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {supplierProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No products yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Add products that this supplier can provide.
              </p>
              <Button
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Product
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">MOQ</TableHead>
                    <TableHead className="text-right">Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierProducts.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{sp.product.name}</div>
                          {sp.supplier_product_code && (
                            <div className="text-xs text-gray-500 mt-1">
                              Code: {sp.supplier_product_code}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sp.product.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sp.product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {sp.unit_price
                          ? formatCurrency(Number(sp.unit_price))
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {sp.minimum_order_qty || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {sp.lead_time_days
                          ? `${sp.lead_time_days} days`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {sp.is_primary_supplier && (
                            <Badge className="bg-blue-500">Primary</Badge>
                          )}
                          {sp.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditProduct(sp)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(sp.id)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <AddSupplierProductDialog
        supplierId={supplierId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Edit Product Dialog */}
      {editProduct && (
        <EditSupplierProductDialog
          supplierProduct={editProduct}
          open={!!editProduct}
          onOpenChange={(open) => !open && setEditProduct(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this product from the supplier?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
