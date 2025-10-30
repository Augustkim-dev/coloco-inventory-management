import { StockBatch, Location } from '@/types'

/**
 * Location별로 재고 배치 그룹화
 * 배치는 그대로 유지하고 Location별로만 그룹화
 * 각 Location 내에서 FIFO 순서로 정렬 (만료일 빠른 순)
 */
export function groupBatchesByLocation(batches: StockBatch[]) {
  const grouped: Record<string, StockBatch[]> = {}

  batches.forEach((batch) => {
    const locId = batch.location_id
    if (!grouped[locId]) {
      grouped[locId] = []
    }
    grouped[locId].push(batch)
  })

  // 각 Location 내에서 FIFO 순서로 정렬 (만료일 빠른 순)
  Object.keys(grouped).forEach((locId) => {
    grouped[locId].sort(
      (a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    )
  })

  return grouped
}

/**
 * Location별 통계 계산
 */
export function calculateLocationStats(batches: StockBatch[]) {
  return {
    totalUnits: batches.reduce((sum, b) => sum + b.qty_on_hand, 0),
    productCount: new Set(batches.map((b) => b.product_id)).size,
  }
}

/**
 * 만료일 기반 Badge variant 계산
 */
export function getExpiryBadgeVariant(
  expiryDate: string
): 'destructive' | 'warning' | 'secondary' | 'outline' {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilExpiry < 0) return 'destructive' // 만료됨
  if (daysUntilExpiry < 30) return 'destructive' // 30일 이내
  if (daysUntilExpiry < 90) return 'warning' // 30-90일 (노랑)
  if (daysUntilExpiry < 180) return 'secondary' // 90-180일 (회색)
  return 'outline' // 180일 이상
}

/**
 * 만료일 이모지
 */
export function getExpiryEmoji(expiryDate: string): string {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilExpiry < 0) return '🔴'
  if (daysUntilExpiry < 30) return '🔴'
  if (daysUntilExpiry < 90) return '🟡'
  if (daysUntilExpiry < 180) return '⚪'
  return '⬜'
}

/**
 * 통화 포맷팅
 */
export function formatCurrency(amount: number, currency: string): string {
  const locale =
    currency === 'KRW' ? 'ko-KR' : currency === 'VND' ? 'vi-VN' : 'zh-CN'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'CNY' ? 2 : 0,
  }).format(amount)
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
