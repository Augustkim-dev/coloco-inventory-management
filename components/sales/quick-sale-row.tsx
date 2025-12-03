'use client'

import { useState, useEffect } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Location, Currency } from '@/types'

interface StockWithProduct {
  product_id: string
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
  qty_on_hand: number
  location_id: string
}

interface QuickSaleRowProps {
  stock: StockWithProduct
  location: Location
  onSaleComplete: () => void
}

export function QuickSaleRow({
  stock,
  location,
  onSaleComplete,
}: QuickSaleRowProps) {
  const [qty, setQty] = useState<number>(0)
  const [unitPrice, setUnitPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(true)

  const supabase = createClient()

  // Fetch unit price from pricing_configs on mount
  useEffect(() => {
    const fetchPrice = async () => {
      setLoadingPrice(true)
      try {
        const { data, error } = await supabase
          .from('pricing_configs')
          .select('final_price')
          .eq('product_id', stock.product_id)
          .eq('to_location_id', location.id)
          .maybeSingle()

        if (error) {
          console.error('Error fetching price:', error)
          setUnitPrice(null)
        } else if (data) {
          setUnitPrice(data.final_price)
        } else {
          setUnitPrice(null)
        }
      } catch (err) {
        console.error('Error:', err)
        setUnitPrice(null)
      } finally {
        setLoadingPrice(false)
      }
    }

    fetchPrice()
  }, [stock.product_id, location.id, supabase])

  const handleSell = async () => {
    if (qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (qty > stock.qty_on_hand) {
      toast.error(`Only ${stock.qty_on_hand} units available`)
      return
    }

    if (!unitPrice) {
      toast.error('No pricing configuration. Contact HQ Admin.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: location.id,
          product_id: stock.product_id,
          qty: qty,
          unit_price: unitPrice,
          currency: location.currency,
          sale_date: new Date().toISOString().split('T')[0],
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create sale')
      }

      toast.success(
        `Sold ${qty} ${stock.product.unit} of ${stock.product.name}`,
        {
          description: `Total: ${formatCurrency(qty * unitPrice, location.currency as Currency)}`,
        }
      )

      setQty(0)
      onSaleComplete()
    } catch (error: any) {
      toast.error('Sale failed', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = unitPrice && qty > 0 ? qty * unitPrice : 0

  return (
    <TableRow>
      {/* Product */}
      <TableCell>
        <div>
          <div className="font-medium">{stock.product.sku}</div>
          <div className="text-sm text-muted-foreground">
            {stock.product.name}
          </div>
        </div>
      </TableCell>

      {/* Available Stock */}
      <TableCell className="text-right">
        <span className={stock.qty_on_hand <= 10 ? 'text-orange-600 font-medium' : ''}>
          {stock.qty_on_hand.toLocaleString()}
        </span>
        <span className="text-muted-foreground ml-1">{stock.product.unit}</span>
      </TableCell>

      {/* Unit Price */}
      <TableCell className="text-right">
        {loadingPrice ? (
          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
        ) : unitPrice ? (
          formatCurrency(unitPrice, location.currency as Currency)
        ) : (
          <span className="text-muted-foreground text-sm">No price</span>
        )}
      </TableCell>

      {/* Quantity Input */}
      <TableCell>
        <Input
          type="number"
          min={0}
          max={stock.qty_on_hand}
          value={qty || ''}
          onChange={(e) => setQty(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-20 text-center mx-auto"
          disabled={loading || !unitPrice}
        />
      </TableCell>

      {/* Action */}
      <TableCell className="text-center">
        <Button
          size="sm"
          onClick={handleSell}
          disabled={loading || qty <= 0 || !unitPrice || qty > stock.qty_on_hand}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Sell'
          )}
        </Button>
        {totalAmount > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(totalAmount, location.currency as Currency)}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}
