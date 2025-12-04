/**
 * 대시보드 데이터 가공 함수들
 *
 * Supabase에서 가져온 원시 데이터를 차트 및 통계에 사용할 수 있는 형태로 변환
 */

import {
  Currency,
  Location,
  LocationType,
  PeriodComparisonStats,
  LocationSalesDetail,
  ProductSalesInLocation,
  DashboardSale
} from '@/types'
import { calculatePercentageChange } from './date-utils'
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

// ===== 신규 대시보드 함수 (Enhanced) =====

/**
 * 원시 판매 데이터를 DashboardSale 형태로 변환 (location 계층 정보 포함)
 */
export function enrichSalesForDashboard(
  salesData: any[],
  locations: Location[],
  exchangeRates: ExchangeRateMap
): DashboardSale[] {
  const locationMap = new Map(locations.map(loc => [loc.id, loc]))

  return salesData.map((sale) => {
    const location = locationMap.get(sale.location_id)

    // 수익 계산 (margin percent는 DB에서 10.00 형태로 저장됨, 소수점으로 변환 필요)
    const hqMarginPct = (sale.pricing_config?.hq_margin_pct || 0) / 100
    const branchMarginPct = (sale.pricing_config?.branch_margin_pct || 0) / 100

    const profits = calculateProfits(
      sale.qty,
      parseFloat(sale.unit_price),
      sale.pricing_config?.local_cost || 0,
      hqMarginPct,
      branchMarginPct
    )

    // KRW로 환산
    const hqProfitKRW = convertToKRW(profits.hqProfit, sale.currency, exchangeRates)
    const branchProfitKRW = convertToKRW(profits.branchProfit, sale.currency, exchangeRates)
    const totalAmountKRW = convertToKRW(sale.total_amount, sale.currency, exchangeRates)

    return {
      id: sale.id,
      sale_date: sale.sale_date,
      location_id: sale.location_id,
      location_name: location?.name || sale.location?.name || 'Unknown',
      location_type: (location?.location_type || 'Branch') as LocationType,
      location_currency: sale.currency,
      parent_id: location?.parent_id || null,
      product_id: sale.product_id,
      product_sku: sale.product?.sku || 'Unknown',
      product_name: sale.product?.name || 'Unknown',
      qty: sale.qty,
      unit_price: parseFloat(sale.unit_price),
      total_amount: parseFloat(sale.total_amount),
      branch_cost: sale.pricing_config?.local_cost || 0,
      hq_margin_pct: hqMarginPct,
      branch_margin_pct: branchMarginPct,
      hq_profit: profits.hqProfit,
      branch_profit: profits.branchProfit,
      total_margin: profits.totalMargin,
      hq_profit_krw: hqProfitKRW,
      branch_profit_krw: branchProfitKRW,
      total_amount_krw: totalAmountKRW,
    }
  })
}

/**
 * 기간 비교 통계 계산
 */
export function calculatePeriodComparison(
  currentSales: DashboardSale[],
  previousSales: DashboardSale[]
): PeriodComparisonStats {
  const current = {
    totalSales: currentSales.reduce((sum, s) => sum + s.total_amount_krw, 0),
    hqProfit: currentSales.reduce((sum, s) => sum + s.hq_profit_krw, 0),
    branchProfit: currentSales.reduce((sum, s) => sum + s.branch_profit_krw, 0),
    qty: currentSales.reduce((sum, s) => sum + s.qty, 0),
    transactions: currentSales.length,
  }

  const previous = {
    totalSales: previousSales.reduce((sum, s) => sum + s.total_amount_krw, 0),
    hqProfit: previousSales.reduce((sum, s) => sum + s.hq_profit_krw, 0),
    branchProfit: previousSales.reduce((sum, s) => sum + s.branch_profit_krw, 0),
    qty: previousSales.reduce((sum, s) => sum + s.qty, 0),
    transactions: previousSales.length,
  }

  return {
    current,
    previous,
    change: {
      salesPct: calculatePercentageChange(current.totalSales, previous.totalSales),
      hqProfitPct: calculatePercentageChange(current.hqProfit, previous.hqProfit),
      branchProfitPct: calculatePercentageChange(current.branchProfit, previous.branchProfit),
      qtyPct: calculatePercentageChange(current.qty, previous.qty),
      transactionsPct: calculatePercentageChange(current.transactions, previous.transactions),
    },
  }
}

/**
 * Location별 판매 집계 (계층 구조 포함)
 * Returns flat list with parent_id for client-side tree building
 */
export function aggregateSalesByLocation(
  sales: DashboardSale[],
  locations: Location[],
  exchangeRates: ExchangeRateMap
): LocationSalesDetail[] {
  const locationMap = new Map(locations.map(loc => [loc.id, loc]))
  const aggregateMap = new Map<string, LocationSalesDetail>()

  // Aggregate sales by location
  sales.forEach((sale) => {
    const location = locationMap.get(sale.location_id)
    if (!location) return

    const existing = aggregateMap.get(sale.location_id)
    const branchProfitKRW = convertToKRW(sale.branch_profit, sale.location_currency, exchangeRates)

    if (existing) {
      existing.sales_local += sale.total_amount
      existing.sales_krw += sale.total_amount_krw
      existing.hq_profit_krw += sale.hq_profit_krw
      existing.branch_profit_krw += branchProfitKRW
      existing.qty += sale.qty
      existing.transactions += 1
    } else {
      const parentLocation = location.parent_id ? locationMap.get(location.parent_id) : null
      aggregateMap.set(sale.location_id, {
        location_id: sale.location_id,
        location_name: location.name,
        location_type: location.location_type as LocationType,
        parent_id: location.parent_id || null,
        parent_name: parentLocation?.name || null,
        currency: location.currency as Currency,
        level: location.level || 1,
        sales_local: sale.total_amount,
        sales_krw: sale.total_amount_krw,
        hq_profit_krw: sale.hq_profit_krw,
        branch_profit_krw: branchProfitKRW,
        qty: sale.qty,
        transactions: 1,
        margin_rate: 0, // Will calculate after
      })
    }
  })

  // Calculate margin rates and sort
  const result = Array.from(aggregateMap.values())
  result.forEach((loc) => {
    loc.margin_rate = loc.sales_krw > 0
      ? (loc.hq_profit_krw + loc.branch_profit_krw) / loc.sales_krw
      : 0
  })

  // Sort by level then by sales
  return result.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return b.sales_krw - a.sales_krw
  })
}

/**
 * Build hierarchical location sales data for tree view
 */
export function buildLocationSalesTree(
  salesByLocation: LocationSalesDetail[]
): LocationSalesDetail[] {
  const locationMap = new Map(salesByLocation.map(loc => [loc.location_id, { ...loc, children: [] as LocationSalesDetail[] }]))
  const roots: LocationSalesDetail[] = []

  // Build tree
  salesByLocation.forEach((loc) => {
    const node = locationMap.get(loc.location_id)!
    if (loc.parent_id && locationMap.has(loc.parent_id)) {
      const parent = locationMap.get(loc.parent_id)!
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else if (loc.location_type === 'Branch') {
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

/**
 * Location 내 제품별 판매 상세
 */
export function getProductsInLocation(
  sales: DashboardSale[],
  locationId: string,
  exchangeRates: ExchangeRateMap
): ProductSalesInLocation[] {
  const productMap = new Map<string, ProductSalesInLocation>()

  const locationSales = sales.filter(s => s.location_id === locationId)

  locationSales.forEach((sale) => {
    const existing = productMap.get(sale.product_id)
    const branchProfitKRW = convertToKRW(sale.branch_profit, sale.location_currency, exchangeRates)

    if (existing) {
      existing.qty += sale.qty
      existing.revenue_local += sale.total_amount
      existing.revenue_krw += sale.total_amount_krw
      existing.hq_profit_krw += sale.hq_profit_krw
      existing.branch_profit_krw += branchProfitKRW
    } else {
      productMap.set(sale.product_id, {
        product_id: sale.product_id,
        product_sku: sale.product_sku,
        product_name: sale.product_name,
        qty: sale.qty,
        revenue_local: sale.total_amount,
        revenue_krw: sale.total_amount_krw,
        hq_profit_krw: sale.hq_profit_krw,
        branch_profit_krw: branchProfitKRW,
        unit_price: sale.unit_price,
        margin_rate: 0, // Will calculate after
      })
    }
  })

  // Calculate margin rates and sort by revenue
  const result = Array.from(productMap.values())
  result.forEach((p) => {
    p.margin_rate = p.revenue_krw > 0
      ? (p.hq_profit_krw + p.branch_profit_krw) / p.revenue_krw
      : 0
  })

  return result.sort((a, b) => b.revenue_krw - a.revenue_krw)
}

/**
 * 전체 제품별 판매 상세 (모든 location 합산)
 */
export function aggregateProductSalesEnhanced(
  sales: DashboardSale[],
  exchangeRates: ExchangeRateMap
): ProductSalesInLocation[] {
  const productMap = new Map<string, ProductSalesInLocation>()

  sales.forEach((sale) => {
    const existing = productMap.get(sale.product_id)
    const branchProfitKRW = convertToKRW(sale.branch_profit, sale.location_currency, exchangeRates)

    if (existing) {
      existing.qty += sale.qty
      existing.revenue_local += sale.total_amount
      existing.revenue_krw += sale.total_amount_krw
      existing.hq_profit_krw += sale.hq_profit_krw
      existing.branch_profit_krw += branchProfitKRW
    } else {
      productMap.set(sale.product_id, {
        product_id: sale.product_id,
        product_sku: sale.product_sku,
        product_name: sale.product_name,
        qty: sale.qty,
        revenue_local: sale.total_amount,
        revenue_krw: sale.total_amount_krw,
        hq_profit_krw: sale.hq_profit_krw,
        branch_profit_krw: branchProfitKRW,
        unit_price: sale.unit_price,
        margin_rate: 0,
      })
    }
  })

  // Calculate margin rates and sort by revenue
  const result = Array.from(productMap.values())
  result.forEach((p) => {
    p.margin_rate = p.revenue_krw > 0
      ? (p.hq_profit_krw + p.branch_profit_krw) / p.revenue_krw
      : 0
  })

  return result.sort((a, b) => b.revenue_krw - a.revenue_krw)
}
