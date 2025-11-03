/**
 * 대시보드 데이터 가공 함수들
 *
 * Supabase에서 가져온 원시 데이터를 차트 및 통계에 사용할 수 있는 형태로 변환
 */

import { Currency } from '@/types'
import { calculateProfits } from './calculations'
import { convertToKRW, ExchangeRateMap } from './currency-converter'

// ===== 타입 정의 =====

export interface SaleWithProfit {
  id: string
  sale_date: string
  location_id: string
  location_name: string
  location_currency: Currency
  product_id: string
  product_sku: string
  product_name: string
  qty: number
  unit_price: number
  total_amount: number
  branch_cost: number
  hq_margin_pct: number
  branch_margin_pct: number
  hq_profit: number
  branch_profit: number
  total_margin: number
  hq_profit_krw: number // KRW로 환산된 본사 이익
  total_amount_krw: number // KRW로 환산된 판매액
}

export interface BranchSalesData {
  branch: string
  sales: number // KRW
  quantity: number
  profit: number // 본사 이익 (KRW)
  currency: Currency
}

export interface SalesTrendData {
  date: string // "2024-01-15" or "2024-W03"
  totalSales: number // KRW
  hqProfit: number // KRW
  vietnamSales?: number // KRW
  chinaSales?: number // KRW
  koreaHQSales?: number // KRW
}

export interface ProductSalesData {
  name: string
  sku: string
  value: number // 판매액 (KRW)
  percentage: number
  qty: number
}

export interface BranchProfitBreakdown {
  branch: string
  hqProfit: number // KRW
  branchProfit: number // KRW
  totalProfit: number // KRW
}

export interface TopProduct {
  rank: number
  sku: string
  name: string
  qty: number
  sales: number // KRW
  hqProfit: number // KRW
}

export interface DashboardStats {
  totalSales: number // KRW
  totalHQProfit: number // KRW
  stockValue: number // KRW
  averageMarginRate: number // 0.25 = 25%
}

// ===== 데이터 가공 함수 =====

/**
 * 원시 판매 데이터에 수익 계산 추가
 */
export function enrichSalesWithProfits(
  salesData: any[],
  exchangeRates: ExchangeRateMap
): SaleWithProfit[] {
  return salesData.map((sale) => {
    // 수익 계산
    const profits = calculateProfits(
      sale.qty,
      sale.unit_price,
      sale.pricing_config?.local_cost || 0,
      sale.pricing_config?.hq_margin_pct || 0,
      sale.pricing_config?.branch_margin_pct || 0
    )

    // KRW로 환산
    const hqProfitKRW = convertToKRW(profits.hqProfit, sale.currency, exchangeRates)
    const totalAmountKRW = convertToKRW(sale.total_amount, sale.currency, exchangeRates)

    return {
      id: sale.id,
      sale_date: sale.sale_date,
      location_id: sale.location_id,
      location_name: sale.location?.name || 'Unknown',
      location_currency: sale.currency,
      product_id: sale.product_id,
      product_sku: sale.product?.sku || 'Unknown',
      product_name: sale.product?.name || 'Unknown',
      qty: sale.qty,
      unit_price: sale.unit_price,
      total_amount: sale.total_amount,
      branch_cost: sale.pricing_config?.local_cost || 0,
      hq_margin_pct: sale.pricing_config?.hq_margin_pct || 0,
      branch_margin_pct: sale.pricing_config?.branch_margin_pct || 0,
      hq_profit: profits.hqProfit,
      branch_profit: profits.branchProfit,
      total_margin: profits.totalMargin,
      hq_profit_krw: hqProfitKRW,
      total_amount_krw: totalAmountKRW,
    }
  })
}

/**
 * 지부별 판매 데이터 집계
 */
export function aggregateBranchSales(sales: SaleWithProfit[]): BranchSalesData[] {
  const branchMap = new Map<string, BranchSalesData>()

  sales.forEach((sale) => {
    const existing = branchMap.get(sale.location_name)

    if (existing) {
      existing.sales += sale.total_amount_krw
      existing.quantity += sale.qty
      existing.profit += sale.hq_profit_krw
    } else {
      branchMap.set(sale.location_name, {
        branch: sale.location_name,
        sales: sale.total_amount_krw,
        quantity: sale.qty,
        profit: sale.hq_profit_krw,
        currency: sale.location_currency,
      })
    }
  })

  return Array.from(branchMap.values()).sort((a, b) => b.sales - a.sales)
}

/**
 * 시계열 판매 트렌드 데이터 생성 (일별 or 주별)
 *
 * @param sales 판매 데이터
 * @param period 'daily' | 'weekly' | 'monthly'
 */
export function generateSalesTrend(
  sales: SaleWithProfit[],
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): SalesTrendData[] {
  const trendMap = new Map<string, SalesTrendData>()

  sales.forEach((sale) => {
    // 날짜 키 생성
    let dateKey: string
    const saleDate = new Date(sale.sale_date)

    if (period === 'daily') {
      dateKey = sale.sale_date
    } else if (period === 'weekly') {
      // ISO 주 번호 계산
      const weekNum = getISOWeek(saleDate)
      const year = saleDate.getFullYear()
      dateKey = `${year}-W${String(weekNum).padStart(2, '0')}`
    } else {
      // monthly
      const year = saleDate.getFullYear()
      const month = saleDate.getMonth() + 1
      dateKey = `${year}-${String(month).padStart(2, '0')}`
    }

    const existing = trendMap.get(dateKey)

    if (existing) {
      existing.totalSales += sale.total_amount_krw
      existing.hqProfit += sale.hq_profit_krw

      // 지부별 집계
      if (sale.location_name.includes('Vietnam')) {
        existing.vietnamSales = (existing.vietnamSales || 0) + sale.total_amount_krw
      } else if (sale.location_name.includes('China')) {
        existing.chinaSales = (existing.chinaSales || 0) + sale.total_amount_krw
      } else {
        existing.koreaHQSales = (existing.koreaHQSales || 0) + sale.total_amount_krw
      }
    } else {
      const newData: SalesTrendData = {
        date: dateKey,
        totalSales: sale.total_amount_krw,
        hqProfit: sale.hq_profit_krw,
      }

      if (sale.location_name.includes('Vietnam')) {
        newData.vietnamSales = sale.total_amount_krw
      } else if (sale.location_name.includes('China')) {
        newData.chinaSales = sale.total_amount_krw
      } else {
        newData.koreaHQSales = sale.total_amount_krw
      }

      trendMap.set(dateKey, newData)
    }
  })

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 제품별 판매 분포 (Top 5 + 기타)
 */
export function aggregateProductSales(sales: SaleWithProfit[]): ProductSalesData[] {
  const productMap = new Map<string, ProductSalesData>()

  sales.forEach((sale) => {
    const key = sale.product_sku
    const existing = productMap.get(key)

    if (existing) {
      existing.value += sale.total_amount_krw
      existing.qty += sale.qty
    } else {
      productMap.set(key, {
        name: sale.product_name,
        sku: sale.product_sku,
        value: sale.total_amount_krw,
        percentage: 0,
        qty: sale.qty,
      })
    }
  })

  // 판매액 기준 정렬
  const sorted = Array.from(productMap.values()).sort((a, b) => b.value - a.value)

  // Top 5만 추출, 나머지는 "기타"로 합침
  const top5 = sorted.slice(0, 5)
  const others = sorted.slice(5)

  const result = [...top5]

  if (others.length > 0) {
    const otherValue = others.reduce((sum, p) => sum + p.value, 0)
    const otherQty = others.reduce((sum, p) => sum + p.qty, 0)
    result.push({
      name: 'Others',
      sku: 'OTHERS',
      value: otherValue,
      percentage: 0,
      qty: otherQty,
    })
  }

  // 비율 계산
  const total = result.reduce((sum, p) => sum + p.value, 0)
  result.forEach((p) => {
    p.percentage = total > 0 ? Math.round((p.value / total) * 100) : 0
  })

  return result
}

/**
 * 지부별 수익 분해 (본사 vs 지부)
 */
export function aggregateProfitBreakdown(
  sales: SaleWithProfit[],
  exchangeRates: ExchangeRateMap
): BranchProfitBreakdown[] {
  const branchMap = new Map<string, BranchProfitBreakdown>()

  sales.forEach((sale) => {
    const existing = branchMap.get(sale.location_name)

    // 지부 이익도 KRW로 환산
    const branchProfitKRW = convertToKRW(
      sale.branch_profit,
      sale.location_currency,
      exchangeRates
    )

    if (existing) {
      existing.hqProfit += sale.hq_profit_krw
      existing.branchProfit += branchProfitKRW
      existing.totalProfit += sale.hq_profit_krw + branchProfitKRW
    } else {
      branchMap.set(sale.location_name, {
        branch: sale.location_name,
        hqProfit: sale.hq_profit_krw,
        branchProfit: branchProfitKRW,
        totalProfit: sale.hq_profit_krw + branchProfitKRW,
      })
    }
  })

  return Array.from(branchMap.values()).sort((a, b) => b.totalProfit - a.totalProfit)
}

/**
 * Top 5 베스트셀러 제품
 */
export function getTopProducts(sales: SaleWithProfit[], limit: number = 5): TopProduct[] {
  const productMap = new Map<
    string,
    { sku: string; name: string; qty: number; sales: number; hqProfit: number }
  >()

  sales.forEach((sale) => {
    const existing = productMap.get(sale.product_sku)

    if (existing) {
      existing.qty += sale.qty
      existing.sales += sale.total_amount_krw
      existing.hqProfit += sale.hq_profit_krw
    } else {
      productMap.set(sale.product_sku, {
        sku: sale.product_sku,
        name: sale.product_name,
        qty: sale.qty,
        sales: sale.total_amount_krw,
        hqProfit: sale.hq_profit_krw,
      })
    }
  })

  // 판매액 기준 정렬
  const sorted = Array.from(productMap.values()).sort((a, b) => b.sales - a.sales)

  return sorted.slice(0, limit).map((p, index) => ({
    rank: index + 1,
    ...p,
  }))
}

/**
 * 대시보드 전체 통계 계산
 */
export function calculateDashboardStats(
  sales: SaleWithProfit[],
  stockBatches: any[],
  exchangeRates: ExchangeRateMap
): DashboardStats {
  // 총 판매액 (KRW)
  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount_krw, 0)

  // 총 본사 이익 (KRW)
  const totalHQProfit = sales.reduce((sum, sale) => sum + sale.hq_profit_krw, 0)

  // 재고 가치 (KRW)
  const stockValue = stockBatches.reduce((sum, batch) => {
    const value = batch.qty_on_hand * batch.unit_cost
    const valueKRW = convertToKRW(value, batch.location?.currency || 'KRW', exchangeRates)
    return sum + valueKRW
  }, 0)

  // 평균 마진율
  const totalMargin = sales.reduce((sum, sale) => sum + sale.total_margin, 0)
  const averageMarginRate = totalSales > 0 ? totalHQProfit / totalSales : 0

  return {
    totalSales,
    totalHQProfit,
    stockValue,
    averageMarginRate,
  }
}

// ===== 유틸리티 함수 =====

/**
 * ISO 주 번호 계산
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * 날짜 범위 생성 (빈 데이터 포인트 채우기용)
 */
export function generateDateRange(
  startDate: Date,
  endDate: Date,
  period: 'daily' | 'weekly' | 'monthly'
): string[] {
  const dates: string[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    if (period === 'daily') {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    } else if (period === 'weekly') {
      const weekNum = getISOWeek(current)
      const year = current.getFullYear()
      dates.push(`${year}-W${String(weekNum).padStart(2, '0')}`)
      current.setDate(current.getDate() + 7)
    } else {
      const year = current.getFullYear()
      const month = current.getMonth() + 1
      dates.push(`${year}-${String(month).padStart(2, '0')}`)
      current.setMonth(current.getMonth() + 1)
    }
  }

  return dates
}
