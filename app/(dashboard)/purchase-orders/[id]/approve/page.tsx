'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function ApprovePOPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleApprove = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/purchase-orders/${params.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve PO')
      }

      toast({ title: 'Purchase order approved successfully' })
      router.push('/purchase-orders')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Approve Purchase Order</h1>
      <Card>
        <CardHeader>
          <CardTitle>Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Are you sure you want to approve this purchase order? Once approved, the PO can be
            received at the warehouse.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? 'Approving...' : 'Approve PO'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
