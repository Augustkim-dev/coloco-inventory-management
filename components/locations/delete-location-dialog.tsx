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

interface DeleteLocationDialogProps {
  locationId: string
  locationName: string
  isOpen: boolean
  onClose: () => void
}

export function DeleteLocationDialog({
  locationId,
  locationName,
  isOpen,
  onClose,
}: DeleteLocationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location')
      }

      // Show appropriate message based on action
      if (data.action === 'deactivated') {
        const depList = Object.entries(data.dependencies || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')

        toast({
          title: 'Location Deactivated',
          description: `"${locationName}" has related data (${depList}) and was deactivated instead of deleted.`,
        })
      } else {
        toast({
          title: 'Location Deleted',
          description: `"${locationName}" was permanently deleted.`,
        })
      }

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
          <AlertDialogTitle>Delete Location</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>&ldquo;{locationName}&rdquo;</strong>?
            <br /><br />
            <span className="text-sm text-muted-foreground">
              If this location has related data (stock, sales, etc.), it will be
              <strong> deactivated</strong> instead of deleted. Deactivated locations
              are hidden from Branch Managers but remain visible to HQ Admin.
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
            {isDeleting ? 'Processing...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
