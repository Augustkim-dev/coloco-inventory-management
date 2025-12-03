'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TemplateCard } from '@/components/pricing/template-card'
import { ApplyTemplateDialog } from '@/components/pricing/apply-template-dialog'
import { PricingTemplate } from '@/types'
import { Plus, ChevronLeft, Loader2 } from 'lucide-react'

export default function PricingTemplatesPage() {
  const [templates, setTemplates] = useState<(PricingTemplate & {
    last_applied_at?: string | null
    last_applied_products?: number
    total_applications?: number
  })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PricingTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pricing/templates')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load templates')
      }

      setTemplates(result.templates || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (template: PricingTemplate) => {
    setSelectedTemplate(template)
    setApplyDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setApplyDialogOpen(open)
    if (!open) {
      setSelectedTemplate(null)
      // Refresh templates to update last_applied info
      loadTemplates()
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/pricing">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Pricing
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pricing Templates</h1>
          <p className="text-gray-600 mt-1">
            Create and manage pricing templates for bulk configuration
          </p>
        </div>
        <Link href="/pricing/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadTemplates} className="mt-4">
            Retry
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-medium">No templates yet</h3>
          <p className="text-muted-foreground mt-1">
            Create your first pricing template to get started
          </p>
          <Link href="/pricing/templates/new">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onApply={handleApply}
            />
          ))}
        </div>
      )}

      {/* Apply Dialog */}
      <ApplyTemplateDialog
        open={applyDialogOpen}
        onOpenChange={handleDialogClose}
        template={selectedTemplate}
      />
    </div>
  )
}
