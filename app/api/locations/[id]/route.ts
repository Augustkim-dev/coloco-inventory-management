import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH - Update location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is HQ_Admin or Branch_Manager
    const { data: userData } = await supabase
      .from('users')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'HQ_Admin' && userData?.role !== 'Branch_Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Branch Manager can only edit their own branch or sub-branches under it
    if (userData?.role === 'Branch_Manager') {
      // Get the location being edited
      const { data: location } = await supabase
        .from('locations')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }

      // Check if it's their own branch or a sub-branch under their branch
      const isOwnBranch = location.id === userData.location_id
      const isSubBranch =
        location.parent_id === userData.location_id &&
        location.location_type === 'SubBranch'

      if (!isOwnBranch && !isSubBranch) {
        return NextResponse.json(
          { error: 'Branch Manager can only edit their own branch or sub-branches under it' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      name,
      location_type,
      country_code,
      currency,
      parent_id,
      address,
      contact_person,
      phone,
      is_active,
    } = body

    // Validate location_type if provided
    if (location_type && !['HQ', 'Branch', 'SubBranch'].includes(location_type)) {
      return NextResponse.json(
        { error: 'Invalid location_type. Must be HQ, Branch, or SubBranch' },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (location_type !== undefined) updateData.location_type = location_type
    if (country_code !== undefined) updateData.country_code = country_code
    if (currency !== undefined) updateData.currency = currency
    if (parent_id !== undefined) updateData.parent_id = parent_id
    if (address !== undefined) updateData.address = address
    if (contact_person !== undefined) updateData.contact_person = contact_person
    if (phone !== undefined) updateData.phone = phone
    if (is_active !== undefined) updateData.is_active = is_active

    // Update location
    const { data: updatedLocation, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!updatedLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(updatedLocation, { status: 200 })
  } catch (error: any) {
    console.error('Error in PATCH /api/locations/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete or deactivate location
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ_Admin can delete/deactivate locations
    const { data: userData } = await supabase
      .from('users')
      .select('role, location_id')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'HQ_Admin') {
      return NextResponse.json(
        { error: 'Only HQ Admin can delete or deactivate locations' },
        { status: 403 }
      )
    }

    // Check if location exists
    const { data: location } = await supabase
      .from('locations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Check if location has children
    const { data: children, count: childCount } = await supabase
      .from('locations')
      .select('id', { count: 'exact' })
      .eq('parent_id', params.id)

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location with children. Delete or deactivate children first.' },
        { status: 400 }
      )
    }

    // Check for related data
    const dependencies: Record<string, number> = {}

    // Check stock_batches
    const { count: stockCount } = await supabase
      .from('stock_batches')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', params.id)
    if (stockCount && stockCount > 0) dependencies.stock_batches = stockCount

    // Check sales
    const { count: salesCount } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', params.id)
    if (salesCount && salesCount > 0) dependencies.sales = salesCount

    // Check pricing_configs (both directions)
    const { count: pricingFromCount } = await supabase
      .from('pricing_configs')
      .select('id', { count: 'exact', head: true })
      .eq('from_location_id', params.id)
    const { count: pricingToCount } = await supabase
      .from('pricing_configs')
      .select('id', { count: 'exact', head: true })
      .eq('to_location_id', params.id)
    const totalPricing = (pricingFromCount || 0) + (pricingToCount || 0)
    if (totalPricing > 0) dependencies.pricing_configs = totalPricing

    // Check stock_transfer_requests (both directions)
    const { count: transferFromCount } = await supabase
      .from('stock_transfer_requests')
      .select('id', { count: 'exact', head: true })
      .eq('from_location_id', params.id)
    const { count: transferToCount } = await supabase
      .from('stock_transfer_requests')
      .select('id', { count: 'exact', head: true })
      .eq('to_location_id', params.id)
    const totalTransfers = (transferFromCount || 0) + (transferToCount || 0)
    if (totalTransfers > 0) dependencies.transfer_requests = totalTransfers

    // Check users assigned to this location
    const { count: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', params.id)
    if (usersCount && usersCount > 0) dependencies.users = usersCount

    const hasRelatedData = Object.keys(dependencies).length > 0

    if (hasRelatedData) {
      // Deactivate instead of delete
      const { error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', params.id)

      if (error) {
        console.error('Error deactivating location:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'deactivated',
        message: 'Location has related data and was deactivated instead of deleted.',
        dependencies,
      }, { status: 200 })
    } else {
      // No related data, perform hard delete
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', params.id)

      if (error) {
        console.error('Error deleting location:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'deleted',
        message: 'Location permanently deleted.',
      }, { status: 200 })
    }
  } catch (error: any) {
    console.error('Error in DELETE /api/locations/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
