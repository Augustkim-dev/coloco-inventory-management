import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/inventory/transfer-requests/[id]/approve
 * Approves a transfer request and executes the actual transfer
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestId = params.id

  try {
    // Fetch the request
    const { data: transferRequest, error: fetchError } = await supabase
      .from('stock_transfer_requests')
      .select('*, from_location:locations!stock_transfer_requests_from_location_id_fkey(*)')
      .eq('id', requestId)
      .single()

    if (fetchError || !transferRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (transferRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `Request is already ${transferRequest.status}` },
        { status: 400 }
      )
    }

    // Update status to Approved
    // The trigger in the database will validate stock availability
    const { error: updateError } = await supabase
      .from('stock_transfer_requests')
      .update({
        status: 'Approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('[approve] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Now execute the actual transfer by calling the transfer API
    // This will use the FIFO logic and update stock_batches
    const transferResponse = await fetch(`${request.url.split('/api')[0]}/api/inventory/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        from_location_id: transferRequest.from_location_id,
        to_location_id: transferRequest.to_location_id,
        product_id: transferRequest.product_id,
        qty: transferRequest.requested_qty
      })
    })

    if (!transferResponse.ok) {
      // Transfer failed, revert approval
      await supabase
        .from('stock_transfer_requests')
        .update({
          status: 'Pending',
          approved_by: null,
          approved_at: null
        })
        .eq('id', requestId)

      const errorData = await transferResponse.json()
      return NextResponse.json(
        { error: `Transfer failed: ${errorData.error}` },
        { status: 500 }
      )
    }

    // Mark as Completed
    await supabase
      .from('stock_transfer_requests')
      .update({ status: 'Completed' })
      .eq('id', requestId)

    return NextResponse.json({
      success: true,
      message: 'Transfer request approved and executed successfully'
    }, { status: 200 })
  } catch (error: any) {
    console.error('[approve] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
