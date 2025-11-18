import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildLocationTree } from '@/lib/hierarchy-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locations/tree
 * Returns all locations in a hierarchical tree structure
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all locations
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[locations/tree] Error fetching locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build tree structure
    const tree = buildLocationTree(locations || [])

    return NextResponse.json({ tree }, { status: 200 })
  } catch (error: any) {
    console.error('[locations/tree] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
