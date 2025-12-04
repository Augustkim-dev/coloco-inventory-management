/**
 * Date Utility Functions for Dashboard
 *
 * Provides date range calculations for period filtering
 */

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'last7days' | 'last30days' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

export interface PeriodRanges {
  current: DateRange
  previous: DateRange
  label: string
  comparisonLabel: string
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of week (Sunday)
 */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0) // Last day of previous month
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days)
}

/**
 * Calculate period ranges for current and previous periods
 * Used for comparison (e.g., today vs yesterday, this week vs last week)
 */
export function calculatePeriodRanges(
  period: PeriodType,
  customFrom?: Date,
  customTo?: Date
): PeriodRanges {
  const now = new Date()
  const today = startOfDay(now)

  switch (period) {
    case 'daily': {
      // Today vs Yesterday
      const todayStart = startOfDay(today)
      const todayEnd = endOfDay(today)
      const yesterdayStart = startOfDay(subtractDays(today, 1))
      const yesterdayEnd = endOfDay(subtractDays(today, 1))

      return {
        current: { from: todayStart, to: todayEnd },
        previous: { from: yesterdayStart, to: yesterdayEnd },
        label: 'Today',
        comparisonLabel: 'vs Yesterday'
      }
    }

    case 'weekly': {
      // This Week vs Last Week
      const thisWeekStart = startOfWeek(today)
      const thisWeekEnd = endOfWeek(today)
      const lastWeekStart = subtractDays(thisWeekStart, 7)
      const lastWeekEnd = subtractDays(thisWeekEnd, 7)

      return {
        current: { from: thisWeekStart, to: thisWeekEnd },
        previous: { from: lastWeekStart, to: lastWeekEnd },
        label: 'This Week',
        comparisonLabel: 'vs Last Week'
      }
    }

    case 'monthly': {
      // This Month vs Last Month
      const thisMonthStart = startOfMonth(today)
      const thisMonthEnd = endOfMonth(today)
      const lastMonth = new Date(today)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const lastMonthStart = startOfMonth(lastMonth)
      const lastMonthEnd = endOfMonth(lastMonth)

      return {
        current: { from: thisMonthStart, to: thisMonthEnd },
        previous: { from: lastMonthStart, to: lastMonthEnd },
        label: 'This Month',
        comparisonLabel: 'vs Last Month'
      }
    }

    case 'last7days': {
      // Last 7 days vs Previous 7 days
      const currentStart = startOfDay(subtractDays(today, 6))
      const currentEnd = endOfDay(today)
      const previousStart = startOfDay(subtractDays(today, 13))
      const previousEnd = endOfDay(subtractDays(today, 7))

      return {
        current: { from: currentStart, to: currentEnd },
        previous: { from: previousStart, to: previousEnd },
        label: 'Last 7 Days',
        comparisonLabel: 'vs Previous 7 Days'
      }
    }

    case 'last30days': {
      // Last 30 days vs Previous 30 days
      const currentStart = startOfDay(subtractDays(today, 29))
      const currentEnd = endOfDay(today)
      const previousStart = startOfDay(subtractDays(today, 59))
      const previousEnd = endOfDay(subtractDays(today, 30))

      return {
        current: { from: currentStart, to: currentEnd },
        previous: { from: previousStart, to: previousEnd },
        label: 'Last 30 Days',
        comparisonLabel: 'vs Previous 30 Days'
      }
    }

    case 'custom': {
      if (!customFrom || !customTo) {
        // Default to last 7 days if no custom range provided
        return calculatePeriodRanges('last7days')
      }

      // Custom range: compare with same duration in previous period
      const currentStart = startOfDay(customFrom)
      const currentEnd = endOfDay(customTo)
      const durationMs = currentEnd.getTime() - currentStart.getTime()
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))

      const previousEnd = subtractDays(currentStart, 1)
      const previousStart = subtractDays(previousEnd, durationDays - 1)

      return {
        current: { from: currentStart, to: currentEnd },
        previous: { from: startOfDay(previousStart), to: endOfDay(previousEnd) },
        label: `${formatDateShort(customFrom)} - ${formatDateShort(customTo)}`,
        comparisonLabel: 'vs Previous Period'
      }
    }

    default:
      return calculatePeriodRanges('weekly')
  }
}

/**
 * Format date as YYYY-MM-DD for API calls
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format date as short display (Dec 4, 2025)
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date range for display
 */
export function formatDateRange(from: Date, to: Date): string {
  const fromStr = formatDateShort(from)
  const toStr = formatDateShort(to)

  // If same day, show just one date
  if (from.toDateString() === to.toDateString()) {
    return fromStr
  }

  return `${fromStr} - ${toStr}`
}

/**
 * Parse URL search params to get period info
 */
export function parsePeriodFromParams(
  searchParams: { period?: string; from?: string; to?: string }
): { period: PeriodType; from?: Date; to?: Date } {
  const { period, from, to } = searchParams

  // Custom date range
  if (from && to) {
    return {
      period: 'custom',
      from: new Date(from),
      to: new Date(to)
    }
  }

  // Preset periods
  const validPeriods: PeriodType[] = ['daily', 'weekly', 'monthly', 'last7days', 'last30days']
  if (period && validPeriods.includes(period as PeriodType)) {
    return { period: period as PeriodType }
  }

  // Default to weekly
  return { period: 'weekly' }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Validate custom date range (max 90 days)
 */
export function validateDateRange(from: Date, to: Date): { valid: boolean; error?: string } {
  const maxDays = 90
  const durationMs = to.getTime() - from.getTime()
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))

  if (from > to) {
    return { valid: false, error: 'Start date must be before end date' }
  }

  if (durationDays > maxDays) {
    return { valid: false, error: `Date range cannot exceed ${maxDays} days` }
  }

  if (to > new Date()) {
    return { valid: false, error: 'End date cannot be in the future' }
  }

  return { valid: true }
}
