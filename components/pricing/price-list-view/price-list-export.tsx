'use client'

import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'
import { exportPriceListToExcel, type PriceListExportData } from '@/lib/excel-export'
import type { PriceListItem } from './price-list-table'

interface PriceListExportProps {
  pricingConfigs: PriceListItem[]
  locationName: string
  currency: string
  marginPercent?: number
  locationId: string
}

export function PriceListExport({
  pricingConfigs,
  locationName,
  currency,
  marginPercent,
  locationId,
}: PriceListExportProps) {
  const handlePrint = () => {
    // Open print page in new window (outside dashboard layout)
    // PDF download is also available on the print page
    const printUrl = `/print/pricing?locationId=${encodeURIComponent(locationId)}`
    const printWindow = window.open(printUrl, '_blank', 'width=900,height=700')

    // Show alert if popup was blocked
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.')
    }
  }

  const handleExcelDownload = () => {
    // Transform data for export
    const exportData: PriceListExportData[] = pricingConfigs.map(config => {
      const parentPrice = config.parentPrice || 0
      const discountedPrice = config.discounted_price || config.final_price
      const marginAmount = discountedPrice - parentPrice

      return {
        productName: config.product.name,
        productCode: config.product.sku,
        purchasePrice: parentPrice,
        marginAmount: marginAmount,
        consumerPrice: config.final_price,
        discountedPrice: discountedPrice,
      }
    })

    // Sort by product code
    exportData.sort((a, b) => a.productCode.localeCompare(b.productCode))

    exportPriceListToExcel(exportData, locationName, currency, marginPercent)
  }

  const isDisabled = pricingConfigs.length === 0

  return (
    <div className="flex gap-2 no-print">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={isDisabled}
      >
        <Printer className="mr-2 h-4 w-4" />
        인쇄 / PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExcelDownload}
        disabled={isDisabled}
      >
        <Download className="mr-2 h-4 w-4" />
        엑셀 다운로드
      </Button>
    </div>
  )
}
