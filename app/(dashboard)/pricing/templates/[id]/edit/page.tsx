import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TemplateForm } from '@/components/pricing/template-form'
import { ChevronLeft } from 'lucide-react'

interface EditTemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication and authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'HQ_Admin') {
    redirect('/dashboard')
  }

  // Fetch template
  const { data: template, error } = await supabase
    .from('pricing_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pricing/templates">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Edit Template</h1>
        <p className="text-gray-600 mt-1">
          Update the pricing template settings
        </p>
      </div>

      <TemplateForm template={template} mode="edit" />
    </div>
  )
}
