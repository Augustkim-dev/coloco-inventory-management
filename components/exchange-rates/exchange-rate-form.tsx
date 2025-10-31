'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

const CURRENCY_PAIRS = [
  { from: 'KRW', to: 'VND', label: 'KRW → VND (Korean Won to Vietnamese Dong)' },
  { from: 'KRW', to: 'CNY', label: 'KRW → CNY (Korean Won to Chinese Yuan)' },
]

export function ExchangeRateForm() {
  const [formData, setFormData] = useState({
    from_currency: 'KRW',
    to_currency: '',
    rate: '',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!formData.to_currency || !formData.rate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill all required fields',
      })
      return
    }

    if (parseFloat(formData.rate) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Exchange rate must be greater than 0',
      })
      return
    }

    if (formData.from_currency === formData.to_currency) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'From and To currencies must be different',
      })
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('exchange_rates').insert([
        {
          from_currency: formData.from_currency,
          to_currency: formData.to_currency,
          rate: parseFloat(formData.rate),
          effective_date: formData.effective_date,
          notes: formData.notes || null,
          created_by: user?.id,
        },
      ])

      if (error) {
        // 중복 에러 처리
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Duplicate Entry',
            description:
              'An exchange rate for this currency pair and date already exists',
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: 'Success',
        description: 'Exchange rate added successfully',
      })
      router.push('/exchange-rates')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add exchange rate',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add New Exchange Rate</CardTitle>
        <CardDescription>
          Enter the exchange rate manually. This will be used for pricing
          calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Currency Pair Selection */}
          <div>
            <Label htmlFor="currency_pair">
              Currency Pair <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.to_currency}
              onValueChange={(value) =>
                setFormData({ ...formData, to_currency: value })
              }
            >
              <SelectTrigger id="currency_pair">
                <SelectValue placeholder="Select currency pair" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_PAIRS.map((pair) => (
                  <SelectItem key={pair.to} value={pair.to}>
                    {pair.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Rate Input */}
          <div>
            <Label htmlFor="rate">
              Exchange Rate <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-medium whitespace-nowrap">
                1 {formData.from_currency} =
              </span>
              <Input
                id="rate"
                type="number"
                step="any"
                min="0"
                placeholder="0.0000"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: e.target.value })
                }
                required
                className="flex-1"
              />
              <span className="text-sm font-medium whitespace-nowrap">
                {formData.to_currency || '---'}
              </span>
            </div>
            {formData.to_currency === 'VND' && (
              <p className="text-sm text-gray-600 mt-2">
                Example: If 1 KRW = 18 VND, enter 18.0000
              </p>
            )}
            {formData.to_currency === 'CNY' && (
              <p className="text-sm text-gray-600 mt-2">
                Example: If 1 KRW = 0.0053 CNY, enter 0.0053
              </p>
            )}
          </div>

          {/* Effective Date */}
          <div>
            <Label htmlFor="effective_date">
              Effective Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) =>
                setFormData({ ...formData, effective_date: e.target.value })
              }
              required
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              The date from which this exchange rate is valid
            </p>
          </div>

          {/* Notes (Optional) */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this exchange rate..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Exchange Rate'}
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
