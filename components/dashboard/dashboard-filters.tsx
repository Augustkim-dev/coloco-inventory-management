'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from 'lucide-react'

export type PeriodType = 'week' | 'month' | 'quarter'

interface DashboardFiltersProps {
  period: PeriodType
  onPeriodChange: (period: PeriodType) => void
}

export function DashboardFilters({ period, onPeriodChange }: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Weekly (Last 8 weeks)</SelectItem>
          <SelectItem value="month">Monthly (Last 12 months)</SelectItem>
          <SelectItem value="quarter">Quarterly (Last 4 quarters)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
