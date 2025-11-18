'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight, TrendingUp } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Product, Location } from '@/types'

interface PriceNode {
  location_id: string
  location_name: string
  location_type: string
  final_price: number | null
  currency: string
  parent_price?: number | null
  hq_margin?: number | null
  branch_margin?: number | null
  transfer_cost?: number | null
  exchange_rate?: number | null
}

interface PricingChainViewProps {
  products: Product[]
  locations: Location[]
}

export function PricingChainView({ products, locations }: PricingChainViewProps) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [priceChain, setPriceChain] = useState<PriceNode[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchPriceChain = async (productId: string, locationId: string) => {
    if (!productId || !locationId) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/pricing/chain?product_id=${productId}&location_id=${locationId}`
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pricing chain')
      }

      setPriceChain(result.chain || [])
    } catch (error: any) {
      console.error('Error fetching price chain:', error)
      setPriceChain([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedProduct && selectedLocation) {
      fetchPriceChain(selectedProduct, selectedLocation)
    }
  }, [selectedProduct, selectedLocation])

  const formatCurrency = (amount: number | null | undefined, currency: string) => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const calculateMarkup = (childPrice: number, parentPrice: number) => {
    if (!parentPrice || !childPrice) return null
    return ((childPrice - parentPrice) / parentPrice * 100).toFixed(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Chain Viewer</CardTitle>
        <CardDescription>
          View how prices cascade from HQ through branches to sub-branches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product and Location Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Target Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((loc) => loc.location_type !== 'HQ')
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.location_type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading pricing chain...</span>
          </div>
        )}

        {/* Price Chain Display */}
        {!loading && priceChain.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Showing price cascade from HQ to {priceChain[priceChain.length - 1]?.location_name}
            </div>

            {priceChain.map((node, index) => {
              const isLast = index === priceChain.length - 1
              const prevNode = index > 0 ? priceChain[index - 1] : null
              const markup = prevNode && node.final_price
                ? calculateMarkup(node.final_price, prevNode.final_price || 0)
                : null

              return (
                <div key={node.location_id}>
                  <Card className={isLast ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{node.location_name}</h3>
                            <Badge
                              variant={
                                node.location_type === 'HQ'
                                  ? 'default'
                                  : node.location_type === 'Branch'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {node.location_type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Currency: {node.currency}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {formatCurrency(node.final_price, node.currency)}
                          </div>
                          {markup && (
                            <div className="text-sm text-green-600">
                              +{markup}% from parent
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      {node.parent_price && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t text-sm">
                          <div>
                            <div className="text-muted-foreground">Parent Price</div>
                            <div className="font-medium">
                              {formatCurrency(node.parent_price, node.currency)}
                            </div>
                          </div>
                          {node.transfer_cost !== undefined && node.transfer_cost !== null && (
                            <div>
                              <div className="text-muted-foreground">Transfer Cost</div>
                              <div className="font-medium">
                                {formatCurrency(node.transfer_cost, node.currency)}
                              </div>
                            </div>
                          )}
                          {node.hq_margin !== undefined && node.hq_margin !== null && (
                            <div>
                              <div className="text-muted-foreground">HQ Margin</div>
                              <div className="font-medium">{node.hq_margin}%</div>
                            </div>
                          )}
                          {node.branch_margin !== undefined && node.branch_margin !== null && (
                            <div>
                              <div className="text-muted-foreground">Branch Margin</div>
                              <div className="font-medium">{node.branch_margin}%</div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Arrow Between Nodes */}
                  {!isLast && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && priceChain.length === 0 && selectedProduct && selectedLocation && (
          <Alert>
            <AlertDescription>
              No pricing data available for this product and location. Please configure pricing first.
            </AlertDescription>
          </Alert>
        )}

        {/* Initial State */}
        {!loading && !selectedProduct && !selectedLocation && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a product and location to view the pricing chain</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
