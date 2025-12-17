'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Download, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

export interface PrintViewItem {
  id: string
  product: {
    sku: string
    name: string
  }
  parentPrice: number | null
  sub_branch_margin_percent: number | null
  final_price: number
  discounted_price: number | null
  discount_percent: number | null
  currency: string
}

interface PrintViewProps {
  pricingConfigs: PrintViewItem[]
  locationName: string
  currency: Currency
  marginPercent: number | null
  mode?: 'print' | 'pdf'
}

// Layout configuration based on data count
function getLayoutConfig(itemCount: number) {
  if (itemCount <= 20) return { fontSize: 'print-font-9pt', columns: 'print-columns-2' }
  if (itemCount <= 40) return { fontSize: 'print-font-8pt', columns: 'print-columns-2' }
  if (itemCount <= 60) return { fontSize: 'print-font-8pt', columns: 'print-columns-3' }
  return { fontSize: 'print-font-7pt', columns: 'print-columns-3' }
}

export function PrintView({
  pricingConfigs,
  locationName,
  currency,
  marginPercent,
  mode,
}: PrintViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const hasTriggeredPdf = useRef(false)

  // Sort by product SKU
  const sortedConfigs = [...pricingConfigs].sort((a, b) =>
    a.product.sku.localeCompare(b.product.sku)
  )

  // Get layout configuration
  const { fontSize, columns } = getLayoutConfig(sortedConfigs.length)

  // Today's date
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    if (!contentRef.current) return

    // Dynamic import to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default

    const date = new Date().toISOString().split('T')[0]
    const sanitizedName = locationName.replace(/[\\/*?[\]:]/g, '_')

    const opt = {
      margin: 10,
      filename: `PriceList_${sanitizedName}_${date}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    }

    html2pdf().set(opt).from(contentRef.current).save()
  }, [locationName])

  // Handle close window
  const handleClose = () => {
    window.close()
  }

  // Auto-focus for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-trigger PDF download when mode=pdf
  useEffect(() => {
    if (mode === 'pdf' && !hasTriggeredPdf.current && sortedConfigs.length > 0) {
      hasTriggeredPdf.current = true
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        handleDownloadPDF()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [mode, sortedConfigs.length, handleDownloadPDF])

  if (sortedConfigs.length === 0) {
    return (
      <div className="print-page">
        <div className="print-actions">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            닫기
          </Button>
        </div>
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg font-medium mb-2">가격 설정이 없습니다</p>
          <p className="text-sm">이 지점에 대한 가격 설정을 먼저 추가해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="print-page">
      {/* Action buttons - hidden when printing */}
      <div className="print-actions">
        <Button variant="default" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          인쇄
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          PDF 다운로드
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="mr-2 h-4 w-4" />
          닫기
        </Button>
        <span className="ml-auto text-sm text-gray-500">
          {sortedConfigs.length}개 제품 | {columns === 'print-columns-3' ? '3단' : '2단'} 레이아웃
        </span>
      </div>

      {/* Print content */}
      <div ref={contentRef} className={fontSize}>
        {/* Header */}
        <div className="print-page-header">
          <h1>{locationName} 가격표</h1>
          <p>발행일: {today}</p>
        </div>

        {/* Multi-column table */}
        <div className={`print-columns ${columns}`}>
          <table className="print-table-compact">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>코드</th>
                <th>제품명</th>
                <th style={{ width: '70px', textAlign: 'right' }}>구매가</th>
                <th style={{ width: '60px', textAlign: 'right' }}>
                  마진{marginPercent ? ` ${marginPercent}%` : ''}
                </th>
                <th style={{ width: '70px', textAlign: 'right' }}>판매가</th>
              </tr>
            </thead>
            <tbody>
              {sortedConfigs.map((config) => {
                const parentPrice = config.parentPrice || 0
                const discountedPrice = config.discounted_price || config.final_price
                const marginAmount = discountedPrice - parentPrice
                const discountPercent = config.discount_percent || 0

                return (
                  <tr key={config.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {config.product.sku}
                    </td>
                    <td style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {config.product.name}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {parentPrice > 0 ? formatCurrency(parentPrice, currency) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {parentPrice > 0 ? formatCurrency(marginAmount, currency) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(discountedPrice, currency)}
                      {discountPercent > 0 && (
                        <span style={{ fontSize: '0.8em', color: '#16a34a' }}>
                          {' '}(-{discountPercent}%)
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
