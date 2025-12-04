'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/navigation'

interface DeletePricingDialogProps {
  configId: string
  productSku: string
  productName: string
  branchName: string
  isOpen: boolean
  onClose: () => void
}

export function DeletePricingDialog({
  configId,
  productSku,
  productName,
  branchName,
  isOpen,
  onClose,
}: DeletePricingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/pricing/${configId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete pricing configuration')
      }

      toast({
        title: 'Pricing Deleted',
        description: `Pricing for "${productSku}" at "${branchName}" was deleted.`,
      })

      onClose()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Pricing Configuration</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the pricing for{' '}
            <strong>&ldquo;{productSku}&rdquo;</strong> ({productName}) at{' '}
            <strong>&ldquo;{branchName}&rdquo;</strong>?
            <br /><br />
            <span className="text-sm text-muted-foreground">
              This action cannot be undone. You will need to reconfigure the pricing
              if you want to sell this product at this location.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
