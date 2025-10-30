'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/inventory-utils'
import { StockBatch, Location } from '@/types'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  transferData: {
    batch: StockBatch & {
      product?: {
        sku: string
        name: string
        unit: string
      }
    }
    fromLocation: Location
    toLocation: Location
    availableQty: number
  }
}

export function TransferDialog({
  open,
  onClose,
  onSuccess,
  transferData,
}: TransferDialogProps) {
  const [quantity, setQuantity] = useState(
    transferData.availableQty.toString()
  )
  const [isLoading, setIsLoading] = useState(false)

  const { batch, fromLocation, toLocation, availableQty } = transferData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const qty = parseInt(quantity)

    // Validation
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (qty > availableQty) {
      toast.error(`Maximum available: ${availableQty} units`)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location_id: fromLocation.id,
          to_location_id: toLocation.id,
          product_id: batch.product_id,
          qty,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Transfer failed')
        return
      }

      toast.success(result.message || 'Transfer completed successfully')
      onSuccess()
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Stock Transfer</DialogTitle>
          <DialogDescription>
            Review the transfer details and enter the quantity to move.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 제품 정보 */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">
                  {batch.product?.name || 'Unknown Product'}
                </span>
                <Badge variant="outline">{batch.product?.sku}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Batch: {batch.batch_no}</div>
                <div>Expiry: {formatDate(batch.expiry_date)}</div>
              </div>
            </div>

            {/* From → To */}
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">From</div>
                <div className="font-medium">{fromLocation.name}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {fromLocation.location_type}
                </Badge>
              </div>

              <ArrowRight className="w-5 h-5 text-muted-foreground mx-4" />

              <div className="flex-1 text-right">
                <div className="text-xs text-muted-foreground">To</div>
                <div className="font-medium">{toLocation.name}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {toLocation.location_type}
                </Badge>
              </div>
            </div>

            {/* 가용 수량 */}
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">
                Available in this batch
              </div>
              <div className="text-2xl font-bold text-primary">
                {availableQty}{' '}
                <span className="text-base font-normal">
                  {batch.product?.unit || 'units'}
                </span>
              </div>
            </div>

            {/* 수량 입력 */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Transfer *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableQty}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Max: {availableQty} units available
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
