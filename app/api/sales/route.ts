import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { location_id, product_id, qty, unit_price, currency, sale_date } = await request.json()

  // Validation
  if (!location_id || !product_id || !qty || !unit_price || !currency || !sale_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (qty <= 0) {
    return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 })
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this location (Branch Manager check)
    const { data: profile } = await supabase
      .from('users')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'Branch_Manager' && profile.location_id !== location_id) {
      return NextResponse.json({ error: 'Access denied to this location' }, { status: 403 })
    }

    // 1. FIFO: Get stock batches ordered by expiry date (earliest first)
    const { data: batches, error: fetchError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('location_id', location_id)
      .eq('product_id', product_id)
      .eq('quality_status', 'OK')
      .gt('qty_on_hand', 0)
      .order('expiry_date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching stock batches:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch stock batches' }, { status: 500 })
    }

    if (!batches || batches.length === 0) {
      return NextResponse.json({ error: 'No stock available for this product' }, { status: 400 })
    }

    // 2. FIFO Logic: Calculate deductions from batches
    let remainingQty = qty
    const deductions: Array<{ batch_id: string; deduct_qty: number; batch_no: string }> = []

    for (const batch of batches) {
      if (remainingQty <= 0) break

      const deductQty = Math.min(batch.qty_on_hand, remainingQty)

      deductions.push({
        batch_id: batch.id,
        deduct_qty: deductQty,
        batch_no: batch.batch_no || 'N/A',
      })

      remainingQty -= deductQty
    }

    // 3. Check if we have enough stock
    if (remainingQty > 0) {
      const availableStock = batches.reduce((sum, b) => sum + b.qty_on_hand, 0)
      return NextResponse.json(
        {
          error: `Insufficient stock. Available: ${availableStock} units, Requested: ${qty} units. Short by ${remainingQty} units.`
        },
        { status: 400 }
      )
    }

    // 4. Deduct stock from batches (sequential updates)
    for (const deduction of deductions) {
      // First, get the current batch to calculate new qty_on_hand
      const currentBatch = batches.find(b => b.id === deduction.batch_id)
      if (!currentBatch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 500 })
      }

      const newQtyOnHand = currentBatch.qty_on_hand - deduction.deduct_qty

      const { error: updateError } = await supabase
        .from('stock_batches')
        .update({
          qty_on_hand: newQtyOnHand,
        })
        .eq('id', deduction.batch_id)

      if (updateError) {
        console.error('Error updating stock batch:', updateError)
        return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
      }
    }

    // 5. Create sale record (total_amount is auto-calculated by database)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{
        location_id,
        product_id,
        sale_date,
        qty,
        unit_price,
        currency,
        created_by: user.id,
      }])
      .select()
      .single()

    if (saleError) {
      console.error('Error creating sale:', saleError)
      return NextResponse.json({ error: 'Failed to create sale record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sale,
      deductions,
      message: `Sale recorded successfully. Stock deducted from ${deductions.length} batch(es).`
    })
  } catch (error: any) {
    console.error('Unexpected error in sales API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to fetch sales
export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    // Build query
    let query = supabase
      .from('sales')
      .select(`
        *,
        product:products(id, sku, name, unit),
        location:locations(id, name, currency)
      `)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Branch Manager can only see their location
    if (profile?.role === 'Branch_Manager' && profile.location_id) {
      query = query.eq('location_id', profile.location_id)
    }

    const { data: sales, error } = await query

    if (error) {
      console.error('Error fetching sales:', error)
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
    }

    return NextResponse.json({ sales })
  } catch (error: any) {
    console.error('Unexpected error in GET sales:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
