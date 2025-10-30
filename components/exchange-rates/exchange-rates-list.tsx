'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { ExchangeRate } from '@/types'

interface ExchangeRatesListProps {
  exchangeRates: ExchangeRate[]
}

export function ExchangeRatesList({ exchangeRates }: ExchangeRatesListProps) {
  // 최신 환율인지 판정하는 함수
  const isLatest = (rate: ExchangeRate, allRates: ExchangeRate[]) => {
    const latest = allRates
      .filter(
        (r) =>
          r.from_currency === rate.from_currency &&
          r.to_currency === rate.to_currency
      )
      .sort(
        (a, b) =>
          new Date(b.effective_date).getTime() -
          new Date(a.effective_date).getTime()
      )[0]
    return latest?.id === rate.id
  }

  // 통화 쌍별로 그룹화
  const groupedRates = exchangeRates.reduce((acc, rate) => {
    const pair = `${rate.from_currency} → ${rate.to_currency}`
    if (!acc[pair]) {
      acc[pair] = []
    }
    acc[pair].push(rate)
    return acc
  }, {} as Record<string, ExchangeRate[]>)

  if (exchangeRates.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-gray-500 text-lg">No exchange rates found</p>
        <p className="text-gray-400 text-sm mt-2">
          Add your first exchange rate to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedRates).map(([pair, rates]) => (
        <div key={pair}>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">{pair}</h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  {rates[0]?.notes && <TableHead>Notes</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {formatDate(rate.effective_date)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        1 {rate.from_currency} ={' '}
                        {rate.rate.toFixed(4)} {rate.to_currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isLatest(rate, exchangeRates) && (
                        <Badge variant="default" className="bg-green-600">
                          Latest
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(rate.created_at)}
                    </TableCell>
                    {rate.notes && (
                      <TableCell className="text-sm text-gray-600">
                        {rate.notes}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
