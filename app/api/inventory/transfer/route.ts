import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canTransferBetween, getAccessibleLocations } from '@/lib/hierarchy-utils'
import { SupabaseClient } from '@supabase/supabase-js'

// Helper function to rollback source deductions
async function rollbackDeductions(
  supabase: SupabaseClient,
  originalQuantities: Array<{ batch_id: string; original_qty: number }>
) {
  for (const item of originalQuantities) {
    try {
      await supabase
        .from('stock_batches')
        .update({
          qty_on_hand: item.original_qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.batch_id)
    } catch (e) {
      console.error('Rollback failed for batch:', item.batch_id, e)
    }
  }
}

// Helper function to rollback target changes
async function rollbackTargetChanges(
  supabase: SupabaseClient,
  targetChanges: Array<{
    type: 'insert' | 'update'
    batch_id: string
    original_qty?: number
  }>
) {
  for (const change of targetChanges) {
    try {
      if (change.type === 'insert') {
        // Delete the newly inserted batch
        await supabase
          .from('stock_batches')
          .delete()
          .eq('id', change.batch_id)
      } else if (change.type === 'update' && change.original_qty !== undefined) {
        // Restore original quantity
        await supabase
          .from('stock_batches')
          .update({
            qty_on_hand: change.original_qty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', change.batch_id)
      }
    } catch (e) {
      console.error('Rollback failed for target batch:', change.batch_id, e)
    }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile with location
  const { data: profile } = await supabase
    .from('users')
    .select('role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  // Only HQ Admin and Branch Manager can transfer
  if (!['HQ_Admin', 'Branch_Manager'].includes(profile.role)) {
    return NextResponse.json({
      error: 'Only HQ Admin and Branch Managers can transfer inventory'
    }, { status: 403 })
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

    // Fetch all locations for hierarchy validation
    const { data: allLocations, error: locError } = await supabase
      .from('locations')
      .select('*')

    if (locError || !allLocations) {
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    // Validate source location access
    const accessibleLocations = getAccessibleLocations(
      profile.location_id,
      profile.role,
      allLocations
    )

    const canAccessSource = accessibleLocations.some(loc => loc.id === from_location_id)

    if (!canAccessSource) {
      return NextResponse.json(
        { error: 'You do not have access to the source location' },
        { status: 403 }
      )
    }

    // Validate transfer between locations (must be direct parent-child)
    const transferValidation = canTransferBetween(
      from_location_id,
      to_location_id,
      allLocations
    )

    if (!transferValidation.valid) {
      return NextResponse.json(
        { error: transferValidation.reason || 'Invalid transfer' },
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

    // Track original quantities for potential rollback
    const originalQuantities: Array<{ batch_id: string; original_qty: number }> = []

    // Step 4: Deduct from source location batches
    for (const deduction of deductions) {
      // Get current quantity first
      const { data: currentBatch } = await supabase
        .from('stock_batches')
        .select('qty_on_hand')
        .eq('id', deduction.batch_id)
        .single()

      if (!currentBatch) {
        // Rollback any previous deductions
        await rollbackDeductions(supabase, originalQuantities)
        return NextResponse.json(
          { error: 'Batch not found during deduction' },
          { status: 500 }
        )
      }

      // Save original quantity for potential rollback
      originalQuantities.push({
        batch_id: deduction.batch_id,
        original_qty: currentBatch.qty_on_hand,
      })

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
        // Rollback any previous deductions
        await rollbackDeductions(supabase, originalQuantities)
        return NextResponse.json(
          { error: 'Failed to deduct from source inventory' },
          { status: 500 }
        )
      }
    }

    // Step 5: Add to target location batches (create or update)
    // Track created/updated target batches for potential rollback
    const targetChanges: Array<{
      type: 'insert' | 'update'
      batch_id: string
      original_qty?: number
    }> = []

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
          // Rollback source deductions and target changes
          await rollbackDeductions(supabase, originalQuantities)
          await rollbackTargetChanges(supabase, targetChanges)
          return NextResponse.json(
            { error: 'Failed to update target inventory' },
            { status: 500 }
          )
        }

        targetChanges.push({
          type: 'update',
          batch_id: existingBatch.id,
          original_qty: existingBatch.qty_on_hand,
        })
      } else {
        // Create new batch at target location
        const { data: insertedBatch, error: insertError } = await supabase
          .from('stock_batches')
          .insert({
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
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting target batch:', insertError)
          // Rollback source deductions and target changes
          await rollbackDeductions(supabase, originalQuantities)
          await rollbackTargetChanges(supabase, targetChanges)
          return NextResponse.json(
            { error: 'Failed to create target inventory. Please check RLS policies.' },
            { status: 500 }
          )
        }

        if (insertedBatch) {
          targetChanges.push({
            type: 'insert',
            batch_id: insertedBatch.id,
          })
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
