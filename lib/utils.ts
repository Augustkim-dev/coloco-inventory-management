import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting
export function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    KRW: '₩',
    VND: '₫',
    CNY: '¥',
  }

  const decimals = currency === 'CNY' ? 2 : 0

  return `${symbols[currency]}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

// Date formatting
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// SKU validation
export function isValidSKU(sku: string): boolean {
  // SKU: Only uppercase letters, numbers, and hyphens allowed
  return /^[A-Z0-9-]+$/.test(sku)
}
