import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Create new location
export async function POST(request: NextRequest) {
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
      is_active = true,
    } = body

    // Branch Manager can only create SubBranch under their own branch
    if (userData?.role === 'Branch_Manager') {
      if (location_type !== 'SubBranch') {
        return NextResponse.json(
          { error: 'Branch Manager can only create Sub-Branches' },
          { status: 403 }
        )
      }
      if (parent_id !== userData.location_id) {
        return NextResponse.json(
          { error: 'Branch Manager can only create Sub-Branches under their own branch' },
          { status: 403 }
        )
      }
    }

    // Validate required fields
    if (!name || !location_type || !country_code || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: name, location_type, country_code, currency' },
        { status: 400 }
      )
    }

    // Validate location_type
    if (!['HQ', 'Branch', 'SubBranch'].includes(location_type)) {
      return NextResponse.json(
        { error: 'Invalid location_type. Must be HQ, Branch, or SubBranch' },
        { status: 400 }
      )
    }

    // Validate SubBranch must have parent
    if (location_type === 'SubBranch' && !parent_id) {
      return NextResponse.json(
        { error: 'SubBranch must have a parent_id' },
        { status: 400 }
      )
    }

    // Get the max display_order to set the new location at the end
    const { data: maxOrderResult } = await supabase
      .from('locations')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextDisplayOrder = (maxOrderResult?.display_order || 0) + 1

    // Insert new location
    const { data: newLocation, error } = await supabase
      .from('locations')
      .insert({
        name,
        location_type,
        country_code,
        currency,
        parent_id: parent_id || null,
        address: address || null,
        contact_person: contact_person || null,
        phone: phone || null,
        is_active,
        display_order: nextDisplayOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(newLocation, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/locations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
