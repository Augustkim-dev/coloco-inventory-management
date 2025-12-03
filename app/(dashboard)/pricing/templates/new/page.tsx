import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TemplateForm } from '@/components/pricing/template-form'
import { ChevronLeft } from 'lucide-react'

export default async function NewTemplatePage() {
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
        <h1 className="text-3xl font-bold">Create Pricing Template</h1>
        <p className="text-gray-600 mt-1">
          Define margin settings that can be applied to multiple products at once
        </p>
      </div>

      <TemplateForm mode="create" />
    </div>
  )
}
