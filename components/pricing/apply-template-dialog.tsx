'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { PricingTemplate, Location, TemplateApplyPreviewItem, Currency } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ApplyTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: PricingTemplate | null
}

interface ExchangeRateOption {
  id: string
  rate: number
  effective_date: string
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  template,
}: ApplyTemplateDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [applying, setApplying] = useState(false)

  const [locations, setLocations] = useState<Location[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateOption[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [selectedExchangeRateId, setSelectedExchangeRateId] = useState<string>('')
  const [previewData, setPreviewData] = useState<TemplateApplyPreviewItem[]>([])
  const [previewStats, setPreviewStats] = useState({
    affected_products: 0,
    created_configs: 0,
    updated_configs: 0,
    skipped_products: 0,
  })

  // Load locations and exchange rates when dialog opens
  useEffect(() => {
    if (open && template) {
      loadData()
    }
  }, [open, template])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLocationIds([])
      setSelectedExchangeRateId('')
      setPreviewData([])
      setPreviewStats({
        affected_products: 0,
        created_configs: 0,
        updated_configs: 0,
        skipped_products: 0,
      })
    }
  }, [open])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load locations (Branch and SubBranch with matching currency)
      const { data: locData } = await supabase
        .from('locations')
        .select('*')
        .in('location_type', ['Branch', 'SubBranch'])
        .eq('currency', template?.target_currency)
        .eq('is_active', true)
        .order('display_order')

      setLocations(locData || [])

      // Load exchange rates for KRW to target currency
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('id, rate, effective_date')
        .eq('from_currency', 'KRW')
        .eq('to_currency', template?.target_currency)
        .order('effective_date', { ascending: false })
        .limit(10)

      setExchangeRates(rateData || [])

      // Auto-select the latest exchange rate
      if (rateData && rateData.length > 0) {
        setSelectedExchangeRateId(rateData[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
    // Clear preview when selection changes
    setPreviewData([])
  }

  const handleSelectAll = () => {
    if (selectedLocationIds.length === locations.length) {
      setSelectedLocationIds([])
    } else {
      setSelectedLocationIds(locations.map(loc => loc.id))
    }
    setPreviewData([])
  }

  const handlePreview = async () => {
    if (!template || selectedLocationIds.length === 0) return

    setPreviewing(true)
    try {
      const response = await fetch('/api/pricing/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          target_location_ids: selectedLocationIds,
          exchange_rate_id: selectedExchangeRateId || undefined,
          action: 'preview',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to preview')
      }

      setPreviewData(result.preview || [])
      setPreviewStats({
        affected_products: result.affected_products,
        created_configs: result.created_configs,
        updated_configs: result.updated_configs,
        skipped_products: result.skipped_products,
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Preview failed',
        description: error.message,
      })
    } finally {
      setPreviewing(false)
    }
  }

  const handleApply = async () => {
    if (!template || selectedLocationIds.length === 0) return

    setApplying(true)
    try {
      const response = await fetch('/api/pricing/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          target_location_ids: selectedLocationIds,
          exchange_rate_id: selectedExchangeRateId || undefined,
          action: 'apply',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply template')
      }

      toast({
        title: 'Template applied successfully',
        description: `Created: ${result.created_configs}, Updated: ${result.updated_configs}`,
      })

      // Refresh first to ensure cache is invalidated, then close dialog
      router.refresh()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Apply failed',
        description: error.message,
      })
    } finally {
      setApplying(false)
    }
  }

  const selectedRate = exchangeRates.find(r => r.id === selectedExchangeRateId)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'update':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      case 'skip':
        return <MinusCircle className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-green-100 text-green-800">New</Badge>
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800">Update</Badge>
      case 'skip':
        return <Badge variant="secondary">Skip</Badge>
      default:
        return null
    }
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Apply Template: {template.name}</DialogTitle>
          <DialogDescription>
            Select locations and preview the pricing configurations that will be created or updated.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Location Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Target Locations ({template.target_currency})</Label>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedLocationIds.length === locations.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No locations found with currency {template.target_currency}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {locations.map(location => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={location.id}
                          checked={selectedLocationIds.includes(location.id)}
                          onCheckedChange={() => handleLocationToggle(location.id)}
                        />
                        <label
                          htmlFor={location.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {location.name}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {location.location_type}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Exchange Rate Selection */}
            <div className="space-y-2">
              <Label>Exchange Rate (KRW → {template.target_currency})</Label>
              <Select
                value={selectedExchangeRateId}
                onValueChange={setSelectedExchangeRateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange rate" />
                </SelectTrigger>
                <SelectContent>
                  {exchangeRates.map(rate => (
                    <SelectItem key={rate.id} value={rate.id}>
                      1 KRW = {rate.rate} {template.target_currency} ({rate.effective_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={selectedLocationIds.length === 0 || !selectedExchangeRateId || previewing}
              >
                {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview Changes
              </Button>
            </div>

            {/* Preview Results */}
            {previewData.length > 0 && (
              <div className="space-y-2">
                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <span>
                    <Badge className="bg-green-100 text-green-800 mr-1">
                      {previewStats.created_configs}
                    </Badge>
                    New
                  </span>
                  <span>
                    <Badge className="bg-blue-100 text-blue-800 mr-1">
                      {previewStats.updated_configs}
                    </Badge>
                    Update
                  </span>
                  <span>
                    <Badge variant="secondary" className="mr-1">
                      {previewStats.skipped_products}
                    </Badge>
                    Skip
                  </span>
                </div>

                {/* Preview Table */}
                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Purchase</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">New Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((item, index) => (
                        <TableRow key={index} className={item.status === 'skip' ? 'opacity-50' : ''}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product_sku}</div>
                              <div className="text-xs text-muted-foreground">{item.product_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.location_name}</TableCell>
                          <TableCell className="text-right">
                            {item.purchase_price > 0
                              ? `${item.purchase_price.toLocaleString()} KRW`
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {item.current_price
                              ? formatCurrency(item.current_price, template.target_currency as Currency)
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.status !== 'skip'
                              ? formatCurrency(item.final_price, template.target_currency as Currency)
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              {getStatusBadge(item.status)}
                            </div>
                            {item.skip_reason && (
                              <div className="text-xs text-muted-foreground">{item.skip_reason}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              selectedLocationIds.length === 0 ||
              !selectedExchangeRateId ||
              previewData.length === 0 ||
              applying ||
              (previewStats.created_configs + previewStats.updated_configs) === 0
            }
          >
            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply {previewStats.created_configs + previewStats.updated_configs} Configurations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
