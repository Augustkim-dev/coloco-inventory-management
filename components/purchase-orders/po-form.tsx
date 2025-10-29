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
import { Plus, Trash2 } from 'lucide-react'

interface POFormProps {
  suppliers: Array<{ id: string; name: string }>
  products: Array<{ id: string; sku: string; name: string; unit: string }>
  mode: 'create' | 'edit'
}

interface POItem {
  product_id: string
  qty: number
  unit_price: number
}

export function POForm({ suppliers, products, mode }: POFormProps) {
  const [formData, setFormData] = useState({
    po_no: `PO-${Date.now()}`,
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [items, setItems] = useState<POItem[]>([{ product_id: '', qty: 1, unit_price: 0 }])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const addItem = () => {
    setItems([...items, { product_id: '', qty: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!formData.supplier_id) {
      toast({ variant: 'destructive', title: 'Please select a supplier' })
      return
    }

    if (items.some((item) => !item.product_id || item.qty <= 0 || item.unit_price < 0)) {
      toast({ variant: 'destructive', title: 'Please fill all item details correctly' })
      return
    }

    setLoading(true)

    try {
      // 현재 사용자 조회
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // PO 생성
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([
          {
            ...formData,
            total_amount: calculateTotal(),
            currency: 'KRW',
            status: 'Draft',
            created_by: user?.id,
          },
        ])
        .select()
        .single()

      if (poError) throw poError

      // PO 아이템 생성
      const { error: itemsError } = await supabase.from('purchase_order_items').insert(
        items.map((item) => ({
          po_id: po.id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          total_price: item.qty * item.unit_price,
        }))
      )

      if (itemsError) throw itemsError

      toast({ title: 'Purchase order created successfully' })
      router.push('/purchase-orders')
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

  const getProductDisplay = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    return product ? `${product.sku} - ${product.name} (${product.unit})` : ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Order Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PO 헤더 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="po_no">PO Number *</Label>
              <Input
                id="po_no"
                value={formData.po_no}
                onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="order_date">Order Date *</Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="supplier_id">Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PO 아이템 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Product</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.sku} - {product.name} ({product.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Unit Price (KRW)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Total</Label>
                    <Input value={(item.qty * item.unit_price).toLocaleString()} disabled />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <span className="text-lg font-bold">Total: {calculateTotal().toLocaleString()} KRW</span>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create PO'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
