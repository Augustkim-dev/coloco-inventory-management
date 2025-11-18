'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Local type for transfer requests with all details
interface TransferRequestWithDetails {
  id: string
  from_location_id: string
  to_location_id: string
  product_id: string
  requested_qty: number
  requested_by: string
  status: string
  notes?: string | null
  rejection_reason?: string | null
  created_at: string
  from_location?: {
    id: string
    name: string
    location_type: string
  }
  to_location?: {
    id: string
    name: string
    location_type: string
  }
  product?: {
    id: string
    name: string
    sku: string
  }
  requested_by_user?: {
    id: string
    name: string
    email: string
  }
}

interface TransferRequestListProps {
  userLocationId: string | null
  userRole: string
}

export function TransferRequestList({ userLocationId, userRole }: TransferRequestListProps) {
  const [requests, setRequests] = useState<TransferRequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TransferRequestWithDetails | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/inventory/transfer-requests')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch requests')
      }

      setRequests(result.requests || [])
    } catch (error: any) {
      console.error('Error fetching requests:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load transfer requests',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('transfer_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_transfer_requests',
        },
        () => {
          fetchRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch(`/api/inventory/transfer-requests/${requestId}/approve`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Approval failed')
      }

      toast({
        title: 'Request Approved',
        description: 'Transfer has been completed successfully',
      })

      fetchRequests()
    } catch (error: any) {
      console.error('Approval error:', error)
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error.message,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectClick = (request: TransferRequestWithDetails) => {
    setSelectedRequest(request)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return

    if (!rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide a reason for rejection',
      })
      return
    }

    setActionLoading(selectedRequest.id)
    try {
      const response = await fetch(`/api/inventory/transfer-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Rejection failed')
      }

      toast({
        title: 'Request Rejected',
        description: 'Transfer request has been rejected',
      })

      setRejectDialogOpen(false)
      fetchRequests()
    } catch (error: any) {
      console.error('Rejection error:', error)
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: error.message,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'Approved':
      case 'Completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        )
      case 'Rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const canApprove = (request: TransferRequestWithDetails) => {
    // Only HQ_Admin or the manager of the source location can approve
    if (userRole === 'HQ_Admin') return true
    if (request.from_location?.id === userLocationId) return true
    return false
  }

  const pendingRequests = requests.filter((r) => r.status === 'Pending')
  const otherRequests = requests.filter((r) => r.status !== 'Pending')

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading requests...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Pending Approval ({pendingRequests.length})
              </CardTitle>
              <CardDescription>
                Transfer requests awaiting your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.from_location?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.to_location?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.product?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.product?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {request.requested_qty.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{request.requested_by_user?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.requested_by_user?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-muted-foreground truncate">
                          {request.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canApprove(request) ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                            >
                              {actionLoading === request.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              <span className="ml-1">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(request)}
                              disabled={actionLoading === request.id}
                            >
                              <XCircle className="h-3 w-3" />
                              <span className="ml-1">Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Awaiting approval</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>
              Completed and rejected transfer requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otherRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No request history available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Notes/Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="font-medium">
                        {request.from_location?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.to_location?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.product?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.product?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {request.requested_qty.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{request.requested_by_user?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.requested_by_user?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-muted-foreground">
                          {request.status === 'Rejected' && request.rejection_reason
                            ? request.rejection_reason
                            : request.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the
              requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{selectedRequest.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{selectedRequest.requested_qty.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">{selectedRequest.from_location?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{selectedRequest.to_location?.name}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">
                Reason for Rejection <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading !== null || !rejectionReason.trim()}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
