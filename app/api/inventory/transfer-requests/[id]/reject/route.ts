import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/inventory/transfer-requests/[id]/reject
 * Rejects a transfer request
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
    const { rejection_reason } = await request.json()

    // Fetch the request
    const { data: transferRequest, error: fetchError } = await supabase
      .from('stock_transfer_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    if (fetchError || !transferRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (transferRequest.status !== 'Pending') {
      return NextResponse.json(
        { error: `Cannot reject: request is already ${transferRequest.status}` },
        { status: 400 }
      )
    }

    // Update status to Rejected
    const { error: updateError } = await supabase
      .from('stock_transfer_requests')
      .update({
        status: 'Rejected',
        rejection_reason: rejection_reason || 'No reason provided',
        approved_by: user.id, // Track who rejected it
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('[reject] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer request rejected'
    }, { status: 200 })
  } catch (error: any) {
    console.error('[reject] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
