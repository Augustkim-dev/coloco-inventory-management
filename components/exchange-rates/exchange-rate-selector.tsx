'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, TrendingUp } from 'lucide-react'
import type { Currency } from '@/types'

interface ExchangeRateSelectorProps {
  fromCurrency: Currency
  toCurrency: Currency
  value: number
  onChange: (rate: number) => void
}

export function ExchangeRateSelector({
  fromCurrency,
  toCurrency,
  value,
  onChange,
}: ExchangeRateSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestRate, setLatestRate] = useState<number | null>(null)

  useEffect(() => {
    const fetchLatestRate = async () => {
      setLoading(true)
      setError(null)

      // Handle same currency (e.g., KRW -> KRW for Korea Branch)
      if (fromCurrency === toCurrency) {
        setLatestRate(1)
        if (!value || value === 0) {
          onChange(1)
        }
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/exchange-rates/latest?from=${fromCurrency}&to=${toCurrency}`
        )

        if (!response.ok) {
          if (response.status === 404) {
            setError(`No exchange rate found for ${fromCurrency} to ${toCurrency}. Please add one first.`)
            return
          }
          throw new Error('Failed to fetch exchange rate')
        }

        const data = await response.json()
        setLatestRate(data.rate)

        // Auto-fill the exchange rate if not already set
        if (!value || value === 0) {
          onChange(data.rate)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load exchange rate')
      } finally {
        setLoading(false)
      }
    }

    if (fromCurrency && toCurrency) {
      fetchLatestRate()
    }
  }, [fromCurrency, toCurrency]) // Removed value and onChange from dependencies

  return (
    <div className="space-y-2">
      <Label htmlFor="exchange_rate">
        Exchange Rate *
        {latestRate && (
          <span className="ml-2 text-xs text-green-600 font-normal">
            <TrendingUp className="inline h-3 w-3 mr-1" />
            Latest: 1 {fromCurrency} = {latestRate} {toCurrency}
          </span>
        )}
      </Label>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">
          1 {fromCurrency} =
        </span>
        <Input
          id="exchange_rate"
          type="number"
          step="any"
          min="0"
          value={value || ''}
          onChange={(e) => {
            const inputValue = e.target.value
            // Allow empty input
            if (inputValue === '') {
              onChange(0)
              return
            }
            // Parse with full precision
            const numValue = parseFloat(inputValue)
            if (!isNaN(numValue) && numValue >= 0) {
              onChange(numValue)
            }
          }}
          required
          disabled={loading}
          className="flex-1"
          placeholder="0.0000"
        />
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {toCurrency}
        </span>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-gray-500">
        The latest exchange rate is automatically loaded. You can adjust it manually if needed.
      </p>
    </div>
  )
}
