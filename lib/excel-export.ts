/**
 * Excel Export Utility
 *
 * Provides functions to export data to Excel format (.xlsx)
 */

import * as XLSX from 'xlsx'

export interface PriceListExportData {
  productName: string
  productCode: string
  purchasePrice: number      // Parent의 discounted_price (구매단가)
  marginAmount: number       // 지부마진 금액 (할인최종가 - 구매단가)
  consumerPrice: number      // final_price (소비자가)
  discountedPrice: number    // discounted_price (할인 최종가)
}

/**
 * Export price list data to Excel file
 * @param data Array of price list items
 * @param locationName Name of the location (used in filename and sheet name)
 * @param currency Currency code for the prices
 * @param marginPercent Optional margin percentage for header display
 */
export function exportPriceListToExcel(
  data: PriceListExportData[],
  locationName: string,
  currency: string,
  marginPercent?: number
): void {
  // Transform data to include headers in Korean
  const marginHeader = marginPercent
    ? `지부마진 (${marginPercent}%)`
    : '지부마진'

  const worksheetData = data.map(item => ({
    '제품명': item.productName,
    '제품코드': item.productCode,
    [`구매단가 (${currency})`]: item.purchasePrice,
    [marginHeader]: item.marginAmount,
    [`소비자가 (${currency})`]: item.consumerPrice,
    [`할인 최종가 (${currency})`]: item.discountedPrice,
  }))

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(worksheetData)

  // Set column widths
  const columnWidths = [
    { wch: 30 }, // 제품명
    { wch: 15 }, // 제품코드
    { wch: 18 }, // 구매단가
    { wch: 12 }, // 지부마진
    { wch: 18 }, // 소비자가
    { wch: 18 }, // 할인 최종가
  ]
  worksheet['!cols'] = columnWidths

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new()

  // Sanitize sheet name (Excel has 31 char limit and no special chars)
  const sanitizedName = locationName
    .replace(/[\\/*?[\]:]/g, '_')
    .substring(0, 31)

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedName)

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0]
  const sanitizedLocationName = locationName.replace(/[\\/*?[\]:]/g, '_')
  const filename = `PriceList_${sanitizedLocationName}_${date}.xlsx`

  // Trigger download
  XLSX.writeFile(workbook, filename)
}

/**
 * Export multiple location price lists to a single Excel file with multiple sheets
 * @param dataByLocation Map of location name to price list data
 * @param currency Currency code
 * @param marginPercent Optional margin percentage for header display
 */
export function exportMultiplePriceListsToExcel(
  dataByLocation: Map<string, PriceListExportData[]>,
  currency: string,
  marginPercent?: number
): void {
  const workbook = XLSX.utils.book_new()
  const marginHeader = marginPercent
    ? `지부마진 (${marginPercent}%)`
    : '지부마진'

  dataByLocation.forEach((data, locationName) => {
    const worksheetData = data.map(item => ({
      '제품명': item.productName,
      '제품코드': item.productCode,
      [`구매단가 (${currency})`]: item.purchasePrice,
      [marginHeader]: item.marginAmount,
      [`소비자가 (${currency})`]: item.consumerPrice,
      [`할인 최종가 (${currency})`]: item.discountedPrice,
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ]

    const sanitizedName = locationName
      .replace(/[\\/*?[\]:]/g, '_')
      .substring(0, 31)

    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedName)
  })

  const date = new Date().toISOString().split('T')[0]
  const filename = `PriceList_All_${date}.xlsx`

  XLSX.writeFile(workbook, filename)
}
