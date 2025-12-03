'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { PricingTemplate, PricingTemplateInsert, Currency } from '@/types'
import { PRODUCT_CATEGORIES, CURRENCIES } from '@/lib/constants'
import { Loader2 } from 'lucide-react'

interface TemplateFormProps {
  template?: PricingTemplate
  mode: 'create' | 'edit'
}

export function TemplateForm({ template, mode }: TemplateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || '',
    target_currency: template?.target_currency || 'VND',
    hq_margin_percent: template?.hq_margin_percent ?? 10,
    branch_margin_percent: template?.branch_margin_percent ?? 30,
    default_transfer_cost: template?.default_transfer_cost ?? 0,
  })

  const totalMargin = formData.hq_margin_percent + formData.branch_margin_percent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Template name is required' })
      return
    }

    if (!formData.target_currency) {
      toast({ variant: 'destructive', title: 'Target currency is required' })
      return
    }

    if (totalMargin >= 100) {
      toast({
        variant: 'destructive',
        title: 'Invalid margin',
        description: 'Total margin (HQ + Branch) must be less than 100%',
      })
      return
    }

    setLoading(true)

    try {
      const payload: PricingTemplateInsert = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category || null,
        target_currency: formData.target_currency as Currency,
        hq_margin_percent: formData.hq_margin_percent,
        branch_margin_percent: formData.branch_margin_percent,
        default_transfer_cost: formData.default_transfer_cost,
      }

      const url = mode === 'create'
        ? '/api/pricing/templates'
        : `/api/pricing/templates/${template?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save template')
      }

      toast({
        title: mode === 'create' ? 'Template created' : 'Template updated',
        description: result.message,
      })

      router.push('/pricing/templates')
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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create Pricing Template' : 'Edit Pricing Template'}
        </CardTitle>
        <CardDescription>
          Define margin settings that can be applied to multiple products at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Vietnam Skincare Standard"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this template"
                rows={2}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Filters</h3>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to apply to all product categories
              </p>
            </div>

            <div>
              <Label htmlFor="target_currency">Target Currency *</Label>
              <Select
                value={formData.target_currency}
                onValueChange={(value) => setFormData({ ...formData, target_currency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.filter(c => c.value !== 'KRW').map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Prices will be calculated in this currency
              </p>
            </div>
          </div>

          {/* Margin Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Margin Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hq_margin">HQ Margin (%)</Label>
                <Input
                  id="hq_margin"
                  type="number"
                  min="0"
                  max="99"
                  step="0.01"
                  value={formData.hq_margin_percent}
                  onChange={(e) => setFormData({
                    ...formData,
                    hq_margin_percent: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>

              <div>
                <Label htmlFor="branch_margin">Branch Margin (%)</Label>
                <Input
                  id="branch_margin"
                  type="number"
                  min="0"
                  max="99"
                  step="0.01"
                  value={formData.branch_margin_percent}
                  onChange={(e) => setFormData({
                    ...formData,
                    branch_margin_percent: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
            </div>

            <div className={`text-sm ${totalMargin >= 100 ? 'text-red-600' : 'text-muted-foreground'}`}>
              Total Margin: {totalMargin.toFixed(2)}%
              {totalMargin >= 100 && ' (must be less than 100%)'}
            </div>
          </div>

          {/* Cost Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Cost Settings</h3>

            <div>
              <Label htmlFor="transfer_cost">Default Transfer Cost (KRW)</Label>
              <Input
                id="transfer_cost"
                type="number"
                min="0"
                step="100"
                value={formData.default_transfer_cost}
                onChange={(e) => setFormData({
                  ...formData,
                  default_transfer_cost: parseFloat(e.target.value) || 0,
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shipping/handling cost per unit in Korean Won
              </p>
            </div>
          </div>

          {/* Price Formula Preview */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Price Calculation Formula</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Local Cost = (Purchase Price + {formData.default_transfer_cost.toLocaleString()} KRW) × Exchange Rate</p>
              <p>2. Selling Price = Local Cost ÷ (1 - {totalMargin.toFixed(2)}%)</p>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Example: If purchase = 5,000 KRW, rate = 18.5:
              <br />
              Local Cost = ({5000} + {formData.default_transfer_cost}) × 18.5 = {((5000 + formData.default_transfer_cost) * 18.5).toLocaleString()} VND
              <br />
              Final = {((5000 + formData.default_transfer_cost) * 18.5 / (1 - totalMargin / 100)).toLocaleString()} VND
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || totalMargin >= 100}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Template' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
