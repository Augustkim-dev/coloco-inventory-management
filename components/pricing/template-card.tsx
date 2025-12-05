'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { PricingTemplate, Currency } from '@/types'
import { formatDate } from '@/lib/utils'
import { MoreVertical, Pencil, Trash2, Play, Loader2 } from 'lucide-react'

interface TemplateCardProps {
  template: PricingTemplate & {
    last_applied_at?: string | null
    last_applied_products?: number
    total_applications?: number
  }
  onApply: (template: PricingTemplate) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  skincare: 'Skincare',
  makeup: 'Makeup',
  haircare: 'Haircare',
  bodycare: 'Bodycare',
  fragrance: 'Fragrance',
}

export function TemplateCard({ template, onApply }: TemplateCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const subBranchMargin = template.sub_branch_margin_percent ?? 0
  const discountPercent = template.discount_percent ?? 0
  const totalMargin = template.hq_margin_percent + template.branch_margin_percent + subBranchMargin

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/pricing/templates/${template.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete template')
      }

      toast({
        title: 'Template deleted',
        description: 'The template has been removed.',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {template.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/pricing/templates/${template.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onApply(template)}>
                  <Play className="mr-2 h-4 w-4" />
                  Apply
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {template.category ? CATEGORY_LABELS[template.category] || template.category : 'All Categories'}
            </Badge>
            <Badge variant="secondary">{template.target_currency}</Badge>
          </div>

          {/* Margin Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">HQ Margin</div>
              <div className="font-medium">{template.hq_margin_percent}%</div>
            </div>
            <div className="bg-muted rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">Branch</div>
              <div className="font-medium">{template.branch_margin_percent}%</div>
            </div>
            {subBranchMargin > 0 && (
              <div className="bg-muted rounded p-2 text-center">
                <div className="text-xs text-muted-foreground">SubBranch</div>
                <div className="font-medium">{subBranchMargin}%</div>
              </div>
            )}
            <div className="bg-muted rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-medium">{totalMargin}%</div>
            </div>
          </div>

          {/* Discount Info */}
          {discountPercent > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default" className="bg-green-600">
                {discountPercent}% Discount
              </Badge>
            </div>
          )}

          {/* Transfer Cost */}
          <div className="text-sm">
            <span className="text-muted-foreground">Transfer Cost: </span>
            <span className="font-medium">{template.default_transfer_cost.toLocaleString()} KRW</span>
          </div>

          {/* Last Applied Info */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            {template.last_applied_at ? (
              <>
                Last applied: {formatDate(template.last_applied_at)}
                <span className="ml-1">
                  ({template.last_applied_products} products)
                </span>
              </>
            ) : (
              'Never applied'
            )}
            {template.total_applications && template.total_applications > 0 && (
              <span className="ml-2">
                • {template.total_applications} total applications
              </span>
            )}
          </div>

          {/* Apply Button */}
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onApply(template)}
          >
            <Play className="mr-2 h-4 w-4" />
            Apply Template
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{template.name}&quot;?
              This action cannot be undone. Existing pricing configurations will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
