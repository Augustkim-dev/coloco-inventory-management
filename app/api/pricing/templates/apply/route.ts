import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { TemplateApplyRequest, TemplateApplyPreviewItem, Currency } from '@/types'

// Helper function to round price based on currency
function roundPrice(price: number, currency: string): number {
  switch (currency) {
    case 'VND':
      return Math.round(price / 1000) * 1000
    case 'CNY':
      return Math.round(price * 100) / 100
    case 'KRW':
      return Math.round(price / 100) * 100
    default:
      return Math.round(price * 100) / 100
  }
}

// Helper function to calculate price from template
function calculatePrice(
  purchasePrice: number,
  transferCost: number,
  exchangeRate: number,
  hqMargin: number,
  branchMargin: number,
  currency: string
): number {
  const localCost = (purchasePrice + transferCost) * exchangeRate
  const marginFactor = 1 - (hqMargin + branchMargin) / 100
  const calculatedPrice = localCost / marginFactor
  return roundPrice(calculatedPrice, currency)
}

// POST: Apply template to generate pricing configs
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body: TemplateApplyRequest = await request.json()

    // Validation
    if (!body.template_id || !body.target_location_ids || body.target_location_ids.length === 0) {
      return NextResponse.json(
        { error: 'Template ID and at least one target location are required' },
        { status: 400 }
      )
    }

    if (!body.action || !['preview', 'apply'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Action must be either "preview" or "apply"' },
        { status: 400 }
      )
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('pricing_templates')
      .select('*')
      .eq('id', body.template_id)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 })
    }

    // Get exchange rate
    let exchangeRate: number
    let exchangeRateId: string | null = null

    if (body.exchange_rate_id) {
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('id, rate')
        .eq('id', body.exchange_rate_id)
        .single()

      if (!rateData) {
        return NextResponse.json({ error: 'Exchange rate not found' }, { status: 404 })
      }
      exchangeRate = rateData.rate
      exchangeRateId = rateData.id
    } else {
      // Get latest exchange rate for KRW to target currency
      const { data: latestRate } = await supabase
        .from('exchange_rates')
        .select('id, rate')
        .eq('from_currency', 'KRW')
        .eq('to_currency', template.target_currency)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (!latestRate) {
        return NextResponse.json(
          { error: `No exchange rate found for KRW to ${template.target_currency}` },
          { status: 400 }
        )
      }
      exchangeRate = latestRate.rate
      exchangeRateId = latestRate.id
    }

    // Get target locations
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, currency')
      .in('id', body.target_location_ids)
      .eq('is_active', true)

    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: 'No valid locations found' }, { status: 400 })
    }

    // Build product query
    let productQuery = supabase
      .from('products')
      .select('id, sku, name, category, default_purchase_price')

    // Apply category filter from template or request
    const categoryFilter = body.product_filter?.category || template.category
    if (categoryFilter) {
      productQuery = productQuery.eq('category', categoryFilter)
    }

    // Apply specific product filter
    if (body.product_filter?.product_ids && body.product_filter.product_ids.length > 0) {
      productQuery = productQuery.in('id', body.product_filter.product_ids)
    }

    const { data: products } = await productQuery

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        affected_products: 0,
        created_configs: 0,
        updated_configs: 0,
        skipped_products: 0,
        message: 'No products match the filter criteria',
        preview: [],
      })
    }

    // Get latest purchase prices for products (from received POs)
    const productIds = products.map(p => p.id)
    const { data: poItems } = await supabase
      .from('purchase_order_items')
      .select(`
        product_id,
        unit_price,
        purchase_order:purchase_orders!inner(status)
      `)
      .in('product_id', productIds)
      .eq('purchase_order.status', 'Received')

    // Build price map (latest price per product)
    const purchasePriceMap: Record<string, number> = {}
    poItems?.forEach(item => {
      // Keep the highest price (most recent or most relevant)
      if (!purchasePriceMap[item.product_id] || item.unit_price > purchasePriceMap[item.product_id]) {
        purchasePriceMap[item.product_id] = item.unit_price
      }
    })

    // Fallback to default_purchase_price when PO price is not available
    products.forEach(product => {
      if (!purchasePriceMap[product.id] && product.default_purchase_price) {
        purchasePriceMap[product.id] = product.default_purchase_price
      }
    })

    // Get existing pricing configs
    const { data: existingConfigs } = await supabase
      .from('pricing_configs')
      .select('id, product_id, to_location_id, final_price')
      .in('product_id', productIds)
      .in('to_location_id', body.target_location_ids)

    // Build existing config map
    const existingConfigMap: Record<string, { id: string; final_price: number }> = {}
    existingConfigs?.forEach(config => {
      existingConfigMap[`${config.product_id}-${config.to_location_id}`] = {
        id: config.id,
        final_price: config.final_price,
      }
    })

    // Generate preview items
    const previewItems: TemplateApplyPreviewItem[] = []
    let skippedCount = 0

    for (const product of products) {
      const purchasePrice = purchasePriceMap[product.id]

      for (const location of locations) {
        const key = `${product.id}-${location.id}`
        const existingConfig = existingConfigMap[key]

        if (!purchasePrice) {
          previewItems.push({
            product_id: product.id,
            product_sku: product.sku,
            product_name: product.name,
            product_category: product.category,
            location_id: location.id,
            location_name: location.name,
            purchase_price: 0,
            transfer_cost: template.default_transfer_cost,
            exchange_rate: exchangeRate,
            calculated_price: 0,
            final_price: 0,
            current_price: existingConfig?.final_price || null,
            status: 'skip',
            skip_reason: 'No purchase price found',
          })
          skippedCount++
          continue
        }

        const finalPrice = calculatePrice(
          purchasePrice,
          template.default_transfer_cost,
          exchangeRate,
          template.hq_margin_percent,
          template.branch_margin_percent,
          template.target_currency
        )

        previewItems.push({
          product_id: product.id,
          product_sku: product.sku,
          product_name: product.name,
          product_category: product.category,
          location_id: location.id,
          location_name: location.name,
          purchase_price: purchasePrice,
          transfer_cost: template.default_transfer_cost,
          exchange_rate: exchangeRate,
          calculated_price: finalPrice,
          final_price: finalPrice,
          current_price: existingConfig?.final_price || null,
          status: existingConfig ? 'update' : 'new',
        })
      }
    }

    // If preview mode, return preview data
    if (body.action === 'preview') {
      const newCount = previewItems.filter(i => i.status === 'new').length
      const updateCount = previewItems.filter(i => i.status === 'update').length

      return NextResponse.json({
        success: true,
        affected_products: products.length,
        created_configs: newCount,
        updated_configs: updateCount,
        skipped_products: skippedCount,
        preview: previewItems,
      })
    }

    // Apply mode - create/update pricing configs
    const itemsToProcess = previewItems.filter(i => i.status !== 'skip')
    let createdCount = 0
    let updatedCount = 0

    // Process in batches of 50
    const batchSize = 50
    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize)

      for (const item of batch) {
        const key = `${item.product_id}-${item.location_id}`
        const existingConfig = existingConfigMap[key]

        if (existingConfig) {
          // Update existing
          const { error } = await supabase
            .from('pricing_configs')
            .update({
              purchase_price: item.purchase_price,
              transfer_cost: item.transfer_cost,
              exchange_rate: exchangeRate,
              hq_margin_percent: template.hq_margin_percent,
              branch_margin_percent: template.branch_margin_percent,
              local_cost: (item.purchase_price + item.transfer_cost) * exchangeRate,
              calculated_price: item.final_price,
              final_price: item.final_price,
            })
            .eq('id', existingConfig.id)

          if (!error) updatedCount++
        } else {
          // Create new
          const { error } = await supabase
            .from('pricing_configs')
            .insert({
              product_id: item.product_id,
              to_location_id: item.location_id,
              purchase_price: item.purchase_price,
              transfer_cost: item.transfer_cost,
              exchange_rate: exchangeRate,
              hq_margin_percent: template.hq_margin_percent,
              branch_margin_percent: template.branch_margin_percent,
              local_cost: (item.purchase_price + item.transfer_cost) * exchangeRate,
              calculated_price: item.final_price,
              final_price: item.final_price,
            })

          if (!error) createdCount++
        }
      }
    }

    // Record application
    const { data: application } = await supabase
      .from('pricing_template_applications')
      .insert({
        template_id: template.id,
        applied_by: user.id,
        target_location_ids: body.target_location_ids,
        product_filter: body.product_filter || null,
        exchange_rate: exchangeRate,
        exchange_rate_id: exchangeRateId,
        products_affected: products.length,
        configs_created: createdCount,
        configs_updated: updatedCount,
      })
      .select('id')
      .single()

    // Revalidate pricing pages to reflect new configs
    revalidatePath('/pricing', 'page')
    revalidatePath('/pricing/templates', 'page')

    return NextResponse.json({
      success: true,
      message: `Successfully applied template to ${createdCount + updatedCount} pricing configurations`,
      affected_products: products.length,
      created_configs: createdCount,
      updated_configs: updatedCount,
      skipped_products: skippedCount,
      application_id: application?.id,
    })
  } catch (error: any) {
    console.error('Unexpected error in apply template:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
