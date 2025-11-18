import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/pricing/calculate
 * Calculates selling price based on parent price and margins
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      parent_price,
      transfer_cost,
      exchange_rate,
      hq_margin,
      branch_margin
    } = await request.json()

    // Validation
    if (
      parent_price === undefined ||
      transfer_cost === undefined ||
      exchange_rate === undefined ||
      hq_margin === undefined ||
      branch_margin === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use the database function to calculate price
    const { data, error } = await supabase
      .rpc('calculate_price_from_parent', {
        p_parent_price: parent_price,
        p_transfer_cost: transfer_cost,
        p_exchange_rate: exchange_rate,
        p_hq_margin: hq_margin,
        p_branch_margin: branch_margin
      })

    if (error) {
      console.error('[pricing/calculate] Error calculating price:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate additional details
    const local_cost = (parent_price + transfer_cost) * exchange_rate
    const total_margin_percent = hq_margin + branch_margin
    const suggested_final_price = Math.round(data / 100) * 100 // Round to nearest 100

    return NextResponse.json({
      local_cost: parseFloat(local_cost.toFixed(2)),
      calculated_price: data,
      suggested_final_price,
      total_margin_percent
    }, { status: 200 })
  } catch (error: any) {
    console.error('[pricing/calculate] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
