'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { PeriodType, formatDateRange, validateDateRange } from '@/lib/date-utils'

interface DashboardPeriodSelectorProps {
  currentPeriod: PeriodType
  dateRange?: { from: Date; to: Date }
  className?: string
}

const periodOptions: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
]

export function DashboardPeriodSelector({
  currentPeriod,
  dateRange,
  className,
}: DashboardPeriodSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customDateOpen, setCustomDateOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange?.from)
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange?.to)
  const [dateError, setDateError] = useState<string | null>(null)

  const handlePeriodChange = (period: PeriodType) => {
    const params = new URLSearchParams(searchParams.toString())
    // Clear any custom date params
    params.delete('from')
    params.delete('to')
    params.set('period', period)
    router.push(`/dashboard?${params.toString()}`)
  }

  const handleCustomDateApply = () => {
    if (!customFrom || !customTo) {
      setDateError('Please select both start and end dates')
      return
    }

    const validation = validateDateRange(customFrom, customTo)
    if (!validation.valid) {
      setDateError(validation.error || 'Invalid date range')
      return
    }

    setDateError(null)
    const params = new URLSearchParams()
    params.delete('period')
    params.set('from', format(customFrom, 'yyyy-MM-dd'))
    params.set('to', format(customTo, 'yyyy-MM-dd'))
    router.push(`/dashboard?${params.toString()}`)
    setCustomDateOpen(false)
  }

  const isCustom = currentPeriod === 'custom'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Period Preset Buttons */}
      {periodOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentPeriod === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePeriodChange(option.value)}
          className="text-xs sm:text-sm"
        >
          {currentPeriod === option.value && (
            <Check className="mr-1 h-3 w-3" />
          )}
          {option.label}
        </Button>
      ))}

      {/* Custom Date Range Picker */}
      <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isCustom ? 'default' : 'outline'}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {isCustom && dateRange
              ? formatDateRange(dateRange.from, dateRange.to)
              : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="text-sm font-medium">Select Date Range</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">From</div>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  disabled={(date: Date) => date > new Date()}
                  initialFocus
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">To</div>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  disabled={(date: Date) => {
                    if (date > new Date()) return true
                    if (customFrom && date < customFrom) return true
                    return false
                  }}
                />
              </div>
            </div>

            {dateError && (
              <div className="text-xs text-destructive">{dateError}</div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Max 90 days range
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomDateOpen(false)
                    setDateError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCustomDateApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Current Date Range Display */}
      {dateRange && (
        <div className="hidden sm:block text-xs text-muted-foreground ml-2">
          Showing: {formatDateRange(dateRange.from, dateRange.to)}
        </div>
      )}
    </div>
  )
}
