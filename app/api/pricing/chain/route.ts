import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pricing/chain?product_id=xxx&location_id=xxx
 * Returns the pricing chain from HQ to the target location for a product
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const locationId = searchParams.get('location_id')

    if (!productId || !locationId) {
      return NextResponse.json(
        { error: 'product_id and location_id are required' },
        { status: 400 }
      )
    }

    // Use the database function to get pricing chain
    const { data: chain, error } = await supabase
      .rpc('get_pricing_chain', {
        p_product_id: productId,
        p_location_id: locationId
      })

    if (error) {
      console.error('[pricing/chain] Error fetching pricing chain:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ chain: chain || [] }, { status: 200 })
  } catch (error: any) {
    console.error('[pricing/chain] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
