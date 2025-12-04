import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// DELETE /api/pricing/[id] - Delete a pricing configuration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role - only HQ_Admin can delete pricing configs
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json(
        { error: 'Access denied. Only HQ Admin can delete pricing configurations.' },
        { status: 403 }
      )
    }

    // Delete the pricing config
    const { error } = await supabase
      .from('pricing_configs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete pricing config:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete pricing configuration' },
        { status: 500 }
      )
    }

    // Revalidate pricing page
    revalidatePath('/pricing', 'page')

    return NextResponse.json({
      success: true,
      message: 'Pricing configuration deleted successfully',
    })
  } catch (error: any) {
    console.error('Unexpected error deleting pricing config:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
