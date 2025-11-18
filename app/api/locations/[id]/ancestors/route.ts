import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBreadcrumbs } from '@/lib/hierarchy-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locations/[id]/ancestors
 * Returns breadcrumb trail (ancestors) for a specific location
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

    // Fetch all locations to build breadcrumb
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')

    if (error) {
      console.error('[locations/ancestors] Error fetching locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build breadcrumb trail
    const breadcrumbs = getBreadcrumbs(locationId, locations || [])

    return NextResponse.json({ breadcrumbs }, { status: 200 })
  } catch (error: any) {
    console.error('[locations/ancestors] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
