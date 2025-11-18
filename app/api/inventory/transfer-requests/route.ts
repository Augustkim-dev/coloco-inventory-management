import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inventory/transfer-requests
 * Fetches transfer requests visible to the current user
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch requests with related data
    const { data: requests, error } = await supabase
      .from('stock_transfer_requests')
      .select(`
        *,
        from_location:locations!stock_transfer_requests_from_location_id_fkey(id, name, location_type),
        to_location:locations!stock_transfer_requests_to_location_id_fkey(id, name, location_type),
        product:products(id, name, sku),
        requested_by_user:users!stock_transfer_requests_requested_by_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[transfer-requests] Fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] }, { status: 200 })
  } catch (error: any) {
    console.error('[transfer-requests] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory/transfer-requests
 * Creates a new transfer request
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { from_location_id, to_location_id, product_id, requested_qty, notes } = await request.json()

    // Validation
    if (!from_location_id || !to_location_id || !product_id || !requested_qty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (requested_qty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // Create request
    const { data: newRequest, error: insertError } = await supabase
      .from('stock_transfer_requests')
      .insert({
        requested_by: user.id,
        from_location_id,
        to_location_id,
        product_id,
        requested_qty,
        notes,
        status: 'Pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[transfer-requests] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ request: newRequest }, { status: 201 })
  } catch (error: any) {
    console.error('[transfer-requests] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
