import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locations/[id]/children
 * Returns direct children of a specific location
 */
export async function GET(
  request: Request,
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

    const locationId = params.id

    // Fetch direct children only
    const { data: children, error } = await supabase
      .from('locations')
      .select('*')
      .eq('parent_location_id', locationId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[locations/children] Error fetching children:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ children: children || [] }, { status: 200 })
  } catch (error: any) {
    console.error('[locations/children] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
