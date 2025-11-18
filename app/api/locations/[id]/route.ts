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

    // Check if user is HQ_Admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      location_type,
      country_code,
      currency,
      parent_location_id,
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
    if (parent_location_id !== undefined) updateData.parent_location_id = parent_location_id
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

// DELETE - Delete location
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

    // Check if user is HQ_Admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if location has children
    const { data: children } = await supabase
      .from('locations')
      .select('id')
      .eq('parent_location_id', params.id)
      .limit(1)

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location with children. Delete children first.' },
        { status: 400 }
      )
    }

    // Delete location
    const { error } = await supabase.from('locations').delete().eq('id', params.id)

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error in DELETE /api/locations/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
