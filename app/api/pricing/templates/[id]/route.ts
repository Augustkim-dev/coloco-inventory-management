import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PricingTemplateUpdate } from '@/types'

// GET: Get a single pricing template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch template with applications
    const { data: template, error } = await supabase
      .from('pricing_templates')
      .select(`
        *,
        applications:pricing_template_applications(
          id,
          applied_at,
          products_affected,
          configs_created,
          configs_updated,
          exchange_rate
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error fetching template:', error)
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Unexpected error in GET template:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update a pricing template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body: PricingTemplateUpdate = await request.json()

    // Validation
    if (body.hq_margin_percent !== undefined && (body.hq_margin_percent < 0 || body.hq_margin_percent >= 100)) {
      return NextResponse.json(
        { error: 'HQ margin must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (body.branch_margin_percent !== undefined && (body.branch_margin_percent < 0 || body.branch_margin_percent >= 100)) {
      return NextResponse.json(
        { error: 'Branch margin must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Validate sub branch margin
    if (body.sub_branch_margin_percent !== undefined && (body.sub_branch_margin_percent < 0 || body.sub_branch_margin_percent >= 100)) {
      return NextResponse.json(
        { error: 'Sub Branch margin must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Validate discount percent
    if (body.discount_percent !== undefined && (body.discount_percent < 0 || body.discount_percent > 100)) {
      return NextResponse.json(
        { error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Get current template to check total margin
    const { data: currentTemplate } = await supabase
      .from('pricing_templates')
      .select('hq_margin_percent, branch_margin_percent, sub_branch_margin_percent')
      .eq('id', id)
      .single()

    if (currentTemplate) {
      const newHqMargin = body.hq_margin_percent ?? currentTemplate.hq_margin_percent
      const newBranchMargin = body.branch_margin_percent ?? currentTemplate.branch_margin_percent
      const newSubBranchMargin = body.sub_branch_margin_percent ?? (currentTemplate.sub_branch_margin_percent || 0)
      const totalMargin = newHqMargin + newBranchMargin + newSubBranchMargin
      if (totalMargin >= 100) {
        return NextResponse.json(
          { error: 'Total margin (HQ + Branch + SubBranch) must be less than 100%' },
          { status: 400 }
        )
      }
    }

    // Update template
    const { data: template, error } = await supabase
      .from('pricing_templates')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template updated successfully',
    })
  } catch (error: any) {
    console.error('Unexpected error in PUT template:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a pricing template (soft delete by setting is_active = false)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Soft delete (set is_active = false)
    const { error } = await supabase
      .from('pricing_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error: any) {
    console.error('Unexpected error in DELETE template:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
