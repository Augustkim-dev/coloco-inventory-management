'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, MapPin, Building2, Store } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { LocationSalesDetail, ProductSalesInLocation, UserRole, DashboardSale } from '@/types'
import { getProductsInLocation } from '@/lib/dashboard-data'
import { ExchangeRateMap } from '@/lib/currency-converter'
import { cn } from '@/lib/utils'

interface LocationSalesTableProps {
  salesByLocation: LocationSalesDetail[]
  sales: DashboardSale[]
  exchangeRates: ExchangeRateMap
  userRole: UserRole
}

interface LocationRowProps {
  location: LocationSalesDetail
  sales: DashboardSale[]
  exchangeRates: ExchangeRateMap
  userRole: UserRole
  isChild?: boolean
}

function LocationIcon({ type }: { type: string }) {
  switch (type) {
    case 'Branch':
      return <Building2 className="h-4 w-4 text-blue-600" />
    case 'SubBranch':
      return <Store className="h-4 w-4 text-green-600" />
    default:
      return <MapPin className="h-4 w-4 text-gray-600" />
  }
}

function ProductsTable({
  products,
  userRole,
}: {
  products: ProductSalesInLocation[]
  userRole: UserRole
}) {
  const isAdmin = userRole === 'HQ_Admin'

  if (products.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 px-6">
        No products sold in this location
      </div>
    )
  }

  return (
    <div className="bg-muted/50 border-t">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-10">SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            {isAdmin && <TableHead className="text-right">HQ Profit</TableHead>}
            <TableHead className="text-right">Branch Profit</TableHead>
            <TableHead className="text-right">Margin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.product_id} className="hover:bg-muted/80">
              <TableCell className="pl-10 font-mono text-xs">
                {product.product_sku}
              </TableCell>
              <TableCell className="font-medium">{product.product_name}</TableCell>
              <TableCell className="text-right">{product.qty.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(product.revenue_krw, 'KRW')}
              </TableCell>
              {isAdmin && (
                <TableCell className="text-right text-green-600">
                  {formatCurrency(product.hq_profit_krw, 'KRW')}
                </TableCell>
              )}
              <TableCell className="text-right text-blue-600">
                {formatCurrency(product.branch_profit_krw, 'KRW')}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {(product.margin_rate * 100).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LocationRow({
  location,
  sales,
  exchangeRates,
  userRole,
  isChild = false,
}: LocationRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [products, setProducts] = useState<ProductSalesInLocation[] | null>(null)
  const isAdmin = userRole === 'HQ_Admin'
  const hasChildren = location.children && location.children.length > 0

  const handleToggle = () => {
    if (!isOpen && products === null) {
      // Lazy load products
      const locationProducts = getProductsInLocation(sales, location.location_id, exchangeRates)
      setProducts(locationProducts)
    }
    setIsOpen(!isOpen)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <TableRow
          className={cn(
            'cursor-pointer transition-colors',
            isChild ? 'bg-muted/30 hover:bg-muted/50' : 'hover:bg-muted/50'
          )}
        >
          <TableCell className={cn(isChild ? 'pl-8' : 'pl-4')}>
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <LocationIcon type={location.location_type} />
              <span className="font-medium">{location.location_name}</span>
              {location.location_type === 'SubBranch' && (
                <span className="text-xs text-muted-foreground">
                  ({location.parent_name})
                </span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-right">{location.qty.toLocaleString()}</TableCell>
          <TableCell className="text-right font-medium">
            {formatCurrency(location.sales_krw, 'KRW')}
          </TableCell>
          {isAdmin && (
            <TableCell className="text-right text-green-600 font-medium">
              {formatCurrency(location.hq_profit_krw, 'KRW')}
            </TableCell>
          )}
          <TableCell className="text-right text-blue-600 font-medium">
            {formatCurrency(location.branch_profit_krw, 'KRW')}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {(location.margin_rate * 100).toFixed(1)}%
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <>
          {/* Products in this location */}
          {products && products.length > 0 && (
            <tr>
              <td colSpan={isAdmin ? 6 : 5} className="p-0">
                <ProductsTable products={products} userRole={userRole} />
              </td>
            </tr>
          )}

          {/* Child locations (SubBranches) */}
          {hasChildren &&
            location.children!.map((child) => (
              <LocationRow
                key={child.location_id}
                location={child}
                sales={sales}
                exchangeRates={exchangeRates}
                userRole={userRole}
                isChild={true}
              />
            ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function LocationSalesTable({
  salesByLocation,
  sales,
  exchangeRates,
  userRole,
}: LocationSalesTableProps) {
  const [expandAll, setExpandAll] = useState(false)
  const isAdmin = userRole === 'HQ_Admin'

  // Build tree structure for display
  const buildTree = (): LocationSalesDetail[] => {
    const locationMap = new Map(
      salesByLocation.map((loc) => [loc.location_id, { ...loc, children: [] as LocationSalesDetail[] }])
    )
    const roots: LocationSalesDetail[] = []

    salesByLocation.forEach((loc) => {
      const node = locationMap.get(loc.location_id)!
      if (loc.parent_id && locationMap.has(loc.parent_id)) {
        const parent = locationMap.get(loc.parent_id)!
        parent.children!.push(node)
      } else {
        // Root level (Branches or standalone SubBranches)
        roots.push(node)
      }
    })

    // Sort children by sales
    const sortChildren = (node: LocationSalesDetail) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => b.sales_krw - a.sales_krw)
        node.children.forEach(sortChildren)
      }
    }

    roots.sort((a, b) => b.sales_krw - a.sales_krw)
    roots.forEach(sortChildren)

    return roots
  }

  const treeData = buildTree()

  if (salesByLocation.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sales by Location
          </CardTitle>
          <CardDescription>
            Detailed breakdown by branch and sub-branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No sales data available for this period
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sales by Location
          </CardTitle>
          <CardDescription>
            Click on a location to see product details
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandAll(!expandAll)}
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Location</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Revenue (KRW)</TableHead>
              {isAdmin && <TableHead className="text-right">HQ Profit</TableHead>}
              <TableHead className="text-right">Branch Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treeData.map((location) => (
              <LocationRow
                key={location.location_id}
                location={location}
                sales={sales}
                exchangeRates={exchangeRates}
                userRole={userRole}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
