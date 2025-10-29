'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface ReceiveItem {
  po_item_id: string
  product_id: string
  product_name: string
  product_sku: string
  product_unit: string
  shelf_life_days: number
  ordered_qty: number
  received_qty: number
  batch_no: string
  manufactured_date: string
  quality_status: 'OK' | 'Damaged' | 'Quarantine'
  unit_cost: number
}

interface ReceiveFormProps {
  po: any
  hqLocationId: string
}

export function ReceiveForm({ po, hqLocationId }: ReceiveFormProps) {
  const [items, setItems] = useState<ReceiveItem[]>(
    po.items.map((item: any) => ({
      po_item_id: item.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_sku: item.product.sku,
      product_unit: item.product.unit,
      shelf_life_days: item.product.shelf_life_days,
      ordered_qty: item.qty,
      received_qty: item.qty,
      batch_no: `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      manufactured_date: new Date().toISOString().split('T')[0],
      quality_status: 'OK' as const,
      unit_cost: item.unit_price,
    }))
  )
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const updateItem = (index: number, field: keyof ReceiveItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateExpiryDate = (manufacturedDate: string, shelfLifeDays: number) => {
    const date = new Date(manufacturedDate)
    date.setDate(date.getDate() + shelfLifeDays)
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (items.some((item) => item.received_qty <= 0 || !item.batch_no || !item.manufactured_date)) {
      toast({ variant: 'destructive', title: 'Please fill all fields correctly' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.product_id,
            location_id: hqLocationId,
            batch_no: item.batch_no,
            qty_on_hand: item.received_qty,
            unit_cost: item.unit_cost,
            manufactured_date: item.manufactured_date,
            expiry_date: calculateExpiryDate(item.manufactured_date, item.shelf_life_days),
            quality_status: item.quality_status,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to receive PO')
      }

      toast({ title: 'Purchase order received successfully' })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive Items - PO: {po.po_no}</CardTitle>
        <p className="text-sm text-gray-500">Supplier: {po.supplier?.name}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {items.map((item, index) => (
              <Card key={item.po_item_id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {item.product_sku} - {item.product_name} ({item.product_unit})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Ordered Qty</Label>
                      <Input value={item.ordered_qty} disabled />
                    </div>
                    <div>
                      <Label>Received Qty *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.received_qty}
                        onChange={(e) => updateItem(index, 'received_qty', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Batch No. *</Label>
                      <Input
                        value={item.batch_no}
                        onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Manufactured Date *</Label>
                      <Input
                        type="date"
                        value={item.manufactured_date}
                        onChange={(e) => updateItem(index, 'manufactured_date', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Expiry Date (Auto)</Label>
                      <Input
                        value={calculateExpiryDate(item.manufactured_date, item.shelf_life_days)}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label>Quality Status *</Label>
                      <Select
                        value={item.quality_status}
                        onValueChange={(value: any) => updateItem(index, 'quality_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OK">OK</SelectItem>
                          <SelectItem value="Damaged">Damaged</SelectItem>
                          <SelectItem value="Quarantine">Quarantine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Receiving...' : 'Confirm Receipt'}
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
