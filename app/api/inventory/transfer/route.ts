import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check user role - only HQ Admin can transfer
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'HQ_Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { from_location_id, to_location_id, product_id, qty } = await request.json()

    // Validation
    if (!from_location_id || !to_location_id || !product_id || !qty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (qty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate location types - only allow HQ ↔ Branch transfers
    const { data: fromLocation } = await supabase
      .from('locations')
      .select('location_type')
      .eq('id', from_location_id)
      .single()

    const { data: toLocation } = await supabase
      .from('locations')
      .select('location_type')
      .eq('id', to_location_id)
      .single()

    if (!fromLocation || !toLocation) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      )
    }

    // Check if transfer is valid (HQ ↔ Branch only)
    const isValidTransfer =
      (fromLocation.location_type === 'HQ' && toLocation.location_type === 'Branch') ||
      (fromLocation.location_type === 'Branch' && toLocation.location_type === 'HQ')

    if (!isValidTransfer) {
      return NextResponse.json(
        { error: 'Can only transfer between HQ and Branches (bidirectional)' },
        { status: 400 }
      )
    }

    // Step 1: Fetch source stock batches with FIFO order (earliest expiry first)
    const { data: sourceBatches, error: fetchError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('location_id', from_location_id)
      .eq('product_id', product_id)
      .eq('quality_status', 'OK')
      .gt('qty_on_hand', 0)
      .order('expiry_date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching source batches:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch source inventory' },
        { status: 500 }
      )
    }

    if (!sourceBatches || sourceBatches.length === 0) {
      return NextResponse.json(
        { error: 'No stock available at source location for this product' },
        { status: 400 }
      )
    }

    // Step 2: Apply FIFO logic - calculate deductions from batches
    let remainingQty = qty
    const deductions: Array<{
      batch_id: string
      batch_no: string
      deduct_qty: number
      unit_cost: number
      manufactured_date: string
      expiry_date: string
    }> = []

    for (const batch of sourceBatches) {
      if (remainingQty <= 0) break

      // Deduct from this batch (up to available quantity)
      const deductQty = Math.min(batch.qty_on_hand, remainingQty)

      deductions.push({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        deduct_qty: deductQty,
        unit_cost: batch.unit_cost,
        manufactured_date: batch.manufactured_date,
        expiry_date: batch.expiry_date,
      })

      remainingQty -= deductQty
    }

    // Step 3: Check if we have enough stock
    if (remainingQty > 0) {
      const totalAvailable = deductions.reduce((sum, d) => sum + d.deduct_qty, 0)
      return NextResponse.json(
        {
          error: `Insufficient stock. Requested: ${qty}, Available: ${totalAvailable}`,
        },
        { status: 400 }
      )
    }

    // Step 4: Deduct from source location batches
    for (const deduction of deductions) {
      // Get current quantity first
      const { data: currentBatch } = await supabase
        .from('stock_batches')
        .select('qty_on_hand')
        .eq('id', deduction.batch_id)
        .single()

      if (!currentBatch) {
        return NextResponse.json(
          { error: 'Batch not found during deduction' },
          { status: 500 }
        )
      }

      // Update with new quantity
      const newQty = currentBatch.qty_on_hand - deduction.deduct_qty

      const { error: updateError } = await supabase
        .from('stock_batches')
        .update({
          qty_on_hand: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deduction.batch_id)

      if (updateError) {
        console.error('Error updating source batch:', updateError)
        // In production, this should trigger a rollback
        return NextResponse.json(
          { error: 'Failed to deduct from source inventory' },
          { status: 500 }
        )
      }
    }

    // Step 5: Add to target location batches (create or update)
    for (const deduction of deductions) {
      // Check if this batch already exists at the target location
      const { data: existingBatch } = await supabase
        .from('stock_batches')
        .select('id, qty_on_hand')
        .eq('location_id', to_location_id)
        .eq('product_id', product_id)
        .eq('batch_no', deduction.batch_no)
        .maybeSingle()

      if (existingBatch) {
        // Update existing batch - add quantity
        const { error: updateError } = await supabase
          .from('stock_batches')
          .update({
            qty_on_hand: existingBatch.qty_on_hand + deduction.deduct_qty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBatch.id)

        if (updateError) {
          console.error('Error updating target batch:', updateError)
          return NextResponse.json(
            { error: 'Failed to update target inventory' },
            { status: 500 }
          )
        }
      } else {
        // Create new batch at target location
        const { error: insertError } = await supabase.from('stock_batches').insert({
          product_id,
          location_id: to_location_id,
          batch_no: deduction.batch_no,
          qty_on_hand: deduction.deduct_qty,
          qty_reserved: 0,
          unit_cost: deduction.unit_cost,
          manufactured_date: deduction.manufactured_date,
          expiry_date: deduction.expiry_date,
          quality_status: 'OK',
        })

        if (insertError) {
          console.error('Error inserting target batch:', insertError)
          return NextResponse.json(
            { error: 'Failed to create target inventory' },
            { status: 500 }
          )
        }
      }
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${qty} units using ${deductions.length} batch(es)`,
      deductions: deductions.map((d) => ({
        batch_no: d.batch_no,
        qty: d.deduct_qty,
        expiry_date: d.expiry_date,
      })),
    })
  } catch (error: any) {
    console.error('Transfer error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
