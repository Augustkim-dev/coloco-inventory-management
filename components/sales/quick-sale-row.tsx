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

interface PriceInfo {
  price: number
  inherited: boolean
  parentLocationName?: string
}

export function QuickSaleRow({
  stock,
  location,
  onSaleComplete,
}: QuickSaleRowProps) {
  const [qty, setQty] = useState<number>(0)
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(true)

  const supabase = createClient()

  // Fetch unit price from pricing_configs with parent fallback
  useEffect(() => {
    const fetchPriceWithInheritance = async () => {
      setLoadingPrice(true)
      try {
        // 1. Try to get direct price for this location
        const { data: directPrice, error: directError } = await supabase
          .from('pricing_configs')
          .select('final_price')
          .eq('product_id', stock.product_id)
          .eq('to_location_id', location.id)
          .maybeSingle()

        if (directError) {
          console.error('Error fetching direct price:', directError)
        }

        if (directPrice) {
          setPriceInfo({ price: directPrice.final_price, inherited: false })
          setLoadingPrice(false)
          return
        }

        // 2. No direct price - try to get parent location's price
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('parent_id')
          .eq('id', location.id)
          .single()

        if (locationError || !locationData?.parent_id) {
          // No parent, no price
          setPriceInfo(null)
          setLoadingPrice(false)
          return
        }

        // 3. Get parent location info and price
        const { data: parentLocation } = await supabase
          .from('locations')
          .select('id, name')
          .eq('id', locationData.parent_id)
          .single()

        const { data: parentPrice, error: parentPriceError } = await supabase
          .from('pricing_configs')
          .select('final_price')
          .eq('product_id', stock.product_id)
          .eq('to_location_id', locationData.parent_id)
          .maybeSingle()

        if (parentPriceError) {
          console.error('Error fetching parent price:', parentPriceError)
        }

        if (parentPrice) {
          setPriceInfo({
            price: parentPrice.final_price,
            inherited: true,
            parentLocationName: parentLocation?.name || 'Parent'
          })
        } else {
          setPriceInfo(null)
        }
      } catch (err) {
        console.error('Error fetching price:', err)
        setPriceInfo(null)
      } finally {
        setLoadingPrice(false)
      }
    }

    fetchPriceWithInheritance()
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

    if (!priceInfo) {
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
          unit_price: priceInfo.price,
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
          description: `Total: ${formatCurrency(qty * priceInfo.price, location.currency as Currency)}`,
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

  const totalAmount = priceInfo && qty > 0 ? qty * priceInfo.price : 0

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
        ) : priceInfo ? (
          <div>
            <div className="flex items-center justify-end gap-1">
              {formatCurrency(priceInfo.price, location.currency as Currency)}
              {priceInfo.inherited && (
                <span className="text-xs text-orange-600 font-medium">(상속)</span>
              )}
            </div>
            {priceInfo.inherited && priceInfo.parentLocationName && (
              <div className="text-xs text-muted-foreground">
                ↳ {priceInfo.parentLocationName}
              </div>
            )}
          </div>
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
          disabled={loading || !priceInfo}
        />
      </TableCell>

      {/* Action */}
      <TableCell className="text-center">
        <Button
          size="sm"
          onClick={handleSell}
          disabled={loading || qty <= 0 || !priceInfo || qty > stock.qty_on_hand}
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
