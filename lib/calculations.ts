/**
 * 판매 수익 계산 함수들
 *
 * 가격 구조:
 * - 판매가 (Final Price) = 지부 원가 / (1 - 본사마진% - 지부마진%)
 * - 총 마진 = 판매가 - 지부 원가
 * - 본사 이익 = 총 마진 * (본사 마진율 / 총 마진율)
 * - 지부 이익 = 총 마진 * (지부 마진율 / 총 마진율)
 */

export interface ProfitCalculation {
  totalAmount: number      // 총 판매액 (수량 * 단가)
  totalCost: number        // 총 원가 (수량 * 지부 원가)
  totalMargin: number      // 총 마진 (판매액 - 원가)
  hqProfit: number         // 본사 이익
  branchProfit: number     // 지부 이익
  hqMarginPct: number      // 본사 마진율
  branchMarginPct: number  // 지부 마진율
}

/**
 * 판매 건별 수익 계산
 *
 * @param qty 판매 수량
 * @param unitPrice 판매 단가
 * @param branchCost 지부 원가 (단가)
 * @param hqMarginPct 본사 마진율 (소수점, 예: 0.10 = 10%)
 * @param branchMarginPct 지부 마진율 (소수점, 예: 0.30 = 30%)
 * @returns 수익 계산 결과
 *
 * @example
 * // 판매가 10,000원, 지부 원가 6,000원, 본사 마진 10%, 지부 마진 30%
 * const profit = calculateProfits(1, 10000, 6000, 0.10, 0.30)
 * // 결과: { totalAmount: 10000, totalMargin: 4000, hqProfit: 1000, branchProfit: 3000 }
 */
export function calculateProfits(
  qty: number,
  unitPrice: number,
  branchCost: number,
  hqMarginPct: number,
  branchMarginPct: number
): ProfitCalculation {
  // 총 판매액
  const totalAmount = qty * unitPrice

  // 총 원가
  const totalCost = qty * branchCost

  // 총 마진
  const totalMargin = totalAmount - totalCost

  // 총 마진율
  const totalMarginPct = hqMarginPct + branchMarginPct

  // 마진율이 0인 경우 예외 처리
  if (totalMarginPct === 0) {
    return {
      totalAmount,
      totalCost,
      totalMargin,
      hqProfit: 0,
      branchProfit: 0,
      hqMarginPct,
      branchMarginPct,
    }
  }

  // 본사 이익 = 총 마진 * (본사 마진율 / 총 마진율)
  const hqProfit = totalMargin * (hqMarginPct / totalMarginPct)

  // 지부 이익 = 총 마진 * (지부 마진율 / 총 마진율)
  const branchProfit = totalMargin * (branchMarginPct / totalMarginPct)

  return {
    totalAmount,
    totalCost,
    totalMargin,
    hqProfit,
    branchProfit,
    hqMarginPct,
    branchMarginPct,
  }
}

/**
 * 실제 마진율 계산 (판매가 대비)
 *
 * @param totalAmount 판매액
 * @param totalMargin 마진
 * @returns 마진율 (소수점, 예: 0.25 = 25%)
 */
export function calculateMarginRate(totalAmount: number, totalMargin: number): number {
  if (totalAmount === 0) return 0
  return totalMargin / totalAmount
}

/**
 * 평균 마진율 계산 (여러 판매 건)
 *
 * @param sales 판매 데이터 배열
 * @returns 평균 마진율 (소수점)
 */
export function calculateAverageMarginRate(
  sales: Array<{ totalAmount: number; totalMargin: number }>
): number {
  if (sales.length === 0) return 0

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalMargins = sales.reduce((sum, sale) => sum + sale.totalMargin, 0)

  return calculateMarginRate(totalSales, totalMargins)
}

/**
 * ROI (Return on Investment) 계산
 *
 * @param profit 이익
 * @param cost 투자 비용
 * @returns ROI (소수점, 예: 0.50 = 50%)
 */
export function calculateROI(profit: number, cost: number): number {
  if (cost === 0) return 0
  return profit / cost
}

/**
 * 목표 대비 달성률 계산
 *
 * @param actual 실제 값
 * @param target 목표 값
 * @returns 달성률 (소수점, 예: 0.85 = 85%)
 */
export function calculateAchievementRate(actual: number, target: number): number {
  if (target === 0) return 0
  return actual / target
}

/**
 * 성장률 계산 (전기 대비)
 *
 * @param current 현재 값
 * @param previous 이전 값
 * @returns 성장률 (소수점, 예: 0.15 = 15% 성장)
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return (current - previous) / previous
}
