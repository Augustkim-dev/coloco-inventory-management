/**
 * 통화 환산 유틸리티 함수들
 *
 * 모든 금액을 KRW(한국 원)로 통일하여 비교 가능하게 합니다.
 */

import { Currency } from '@/types'

export interface ExchangeRateMap {
  [key: string]: number // 'VND_to_KRW', 'CNY_to_KRW' 등
}

/**
 * 환율 맵 생성 (Supabase 데이터로부터)
 *
 * @param rates Supabase에서 가져온 환율 데이터
 * @returns 환율 맵 객체
 *
 * @example
 * const rates = [
 *   { from_currency: 'VND', to_currency: 'KRW', rate: 0.055 },
 *   { from_currency: 'CNY', to_currency: 'KRW', rate: 190.5 }
 * ]
 * const rateMap = createExchangeRateMap(rates)
 * // { 'VND_to_KRW': 0.055, 'CNY_to_KRW': 190.5 }
 */
export function createExchangeRateMap(
  rates: Array<{
    from_currency: string
    to_currency: string
    rate: number
  }>
): ExchangeRateMap {
  const rateMap: ExchangeRateMap = {}

  rates.forEach((rate) => {
    const key = `${rate.from_currency}_to_${rate.to_currency}`
    rateMap[key] = rate.rate
  })

  return rateMap
}

/**
 * 통화를 KRW로 환산
 *
 * @param amount 원래 금액
 * @param currency 원래 통화
 * @param exchangeRates 환율 맵
 * @returns KRW로 환산된 금액
 *
 * @example
 * const rateMap = { 'VND_to_KRW': 0.055 }
 * const krw = convertToKRW(10000, 'VND', rateMap)
 * // 550 (10,000 VND = 550 KRW)
 */
export function convertToKRW(
  amount: number,
  currency: Currency,
  exchangeRates: ExchangeRateMap
): number {
  // 이미 KRW면 그대로 반환
  if (currency === 'KRW') {
    return amount
  }

  // 환율 조회
  const rateKey = `${currency}_to_KRW`
  const rate = exchangeRates[rateKey]

  // 환율이 없으면 경고 로그 후 0 반환
  if (rate === undefined || rate === null) {
    console.warn(`Exchange rate not found for ${currency} to KRW`)
    return 0
  }

  // 환산
  return amount * rate
}

/**
 * KRW를 다른 통화로 환산
 *
 * @param amountInKRW KRW 금액
 * @param targetCurrency 목표 통화
 * @param exchangeRates 환율 맵
 * @returns 목표 통화로 환산된 금액
 *
 * @example
 * const rateMap = { 'KRW_to_VND': 18.18 }
 * const vnd = convertFromKRW(1000, 'VND', rateMap)
 * // 18180 (1,000 KRW = 18,180 VND)
 */
export function convertFromKRW(
  amountInKRW: number,
  targetCurrency: Currency,
  exchangeRates: ExchangeRateMap
): number {
  // 이미 KRW면 그대로 반환
  if (targetCurrency === 'KRW') {
    return amountInKRW
  }

  // 환율 조회
  const rateKey = `KRW_to_${targetCurrency}`
  const rate = exchangeRates[rateKey]

  // 환율이 없으면 역산 시도
  if (rate === undefined || rate === null) {
    const reverseKey = `${targetCurrency}_to_KRW`
    const reverseRate = exchangeRates[reverseKey]

    if (reverseRate && reverseRate !== 0) {
      // 역산: KRW / (VND_to_KRW) = VND
      return amountInKRW / reverseRate
    }

    console.warn(`Exchange rate not found for KRW to ${targetCurrency}`)
    return 0
  }

  // 환산
  return amountInKRW * rate
}

/**
 * 통화 간 직접 환산
 *
 * @param amount 원래 금액
 * @param fromCurrency 원래 통화
 * @param toCurrency 목표 통화
 * @param exchangeRates 환율 맵
 * @returns 목표 통화로 환산된 금액
 *
 * @example
 * const rateMap = { 'VND_to_KRW': 0.055, 'CNY_to_KRW': 190.5 }
 * const cny = convertCurrency(10000, 'VND', 'CNY', rateMap)
 * // 약 2.89 CNY (10,000 VND → 550 KRW → 2.89 CNY)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates: ExchangeRateMap
): number {
  // 같은 통화면 그대로 반환
  if (fromCurrency === toCurrency) {
    return amount
  }

  // KRW를 중간 통화로 사용
  const amountInKRW = convertToKRW(amount, fromCurrency, exchangeRates)
  return convertFromKRW(amountInKRW, toCurrency, exchangeRates)
}

/**
 * 최신 환율 데이터 가져오기 (Supabase 쿼리 헬퍼)
 *
 * @param supabase Supabase 클라이언트
 * @returns 환율 맵 객체
 */
export async function fetchLatestExchangeRates(
  supabase: any
): Promise<ExchangeRateMap> {
  const { data: rates, error } = await supabase
    .from('exchange_rates')
    .select('from_currency, to_currency, rate, effective_date')
    .order('effective_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch exchange rates:', error)
    return {}
  }

  if (!rates || rates.length === 0) {
    console.warn('No exchange rates found in database')
    return {}
  }

  // 각 통화 쌍의 최신 환율만 유지
  const latestRates: { [key: string]: any } = {}

  rates.forEach((rate: any) => {
    const key = `${rate.from_currency}_to_${rate.to_currency}`

    // 이미 있는 키는 더 최신 날짜가 먼저 오므로 건너뜀
    if (!latestRates[key]) {
      latestRates[key] = rate
    }
  })

  return createExchangeRateMap(Object.values(latestRates))
}

/**
 * 통화 포맷팅 (표시용)
 *
 * @param amount 금액
 * @param currency 통화
 * @returns 포맷팅된 문자열
 *
 * @example
 * formatCurrencyWithSymbol(10000, 'KRW') // '₩10,000'
 * formatCurrencyWithSymbol(50000, 'VND') // '₫50,000'
 * formatCurrencyWithSymbol(100, 'CNY') // '¥100.00'
 */
export function formatCurrencyWithSymbol(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    KRW: '₩',
    VND: '₫',
    CNY: '¥',
  }

  const decimals: Record<Currency, number> = {
    KRW: 0,
    VND: 0,
    CNY: 2,
  }

  const symbol = symbols[currency]
  const decimal = decimals[currency]

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  })

  return `${symbol}${formatted}`
}
