import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PricingTemplateInsert } from '@/types'

// GET: List all pricing templates
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role (only HQ_Admin can manage templates)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'HQ_Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch templates with last application info
    const { data: templates, error } = await supabase
      .from('pricing_templates')
      .select(`
        *,
        applications:pricing_template_applications(
          id,
          applied_at,
          products_affected
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Process to add last_applied info
    const templatesWithLastApplied = templates?.map(template => {
      const applications = template.applications || []
      const lastApplication = applications.sort((a: any, b: any) =>
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      )[0]

      return {
        ...template,
        applications: undefined,
        last_applied_at: lastApplication?.applied_at || null,
        last_applied_products: lastApplication?.products_affected || 0,
        total_applications: applications.length,
      }
    })

    return NextResponse.json({ templates: templatesWithLastApplied })
  } catch (error: any) {
    console.error('Unexpected error in GET templates:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new pricing template
export async function POST(request: Request) {
  try {
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

    const body: PricingTemplateInsert = await request.json()

    // Validation
    if (!body.name || !body.target_currency) {
      return NextResponse.json(
        { error: 'Name and target currency are required' },
        { status: 400 }
      )
    }

    if (body.hq_margin_percent < 0 || body.hq_margin_percent >= 100) {
      return NextResponse.json(
        { error: 'HQ margin must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (body.branch_margin_percent < 0 || body.branch_margin_percent >= 100) {
      return NextResponse.json(
        { error: 'Branch margin must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (body.hq_margin_percent + body.branch_margin_percent >= 100) {
      return NextResponse.json(
        { error: 'Total margin (HQ + Branch) must be less than 100%' },
        { status: 400 }
      )
    }

    // Create template
    const { data: template, error } = await supabase
      .from('pricing_templates')
      .insert({
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        target_currency: body.target_currency,
        hq_margin_percent: body.hq_margin_percent,
        branch_margin_percent: body.branch_margin_percent,
        default_transfer_cost: body.default_transfer_cost || 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template created successfully',
    })
  } catch (error: any) {
    console.error('Unexpected error in POST template:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
