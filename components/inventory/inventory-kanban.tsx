'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { Accordion } from '@/components/ui/accordion'
import { LocationAccordion } from './location-accordion'
import { BatchCard } from './batch-card'
import { TransferDialog } from './transfer-dialog'
import { groupBatchesByLocation } from '@/lib/inventory-utils'
import { toast } from 'sonner'
import { StockBatch, Location } from '@/types'

interface InventoryKanbanProps {
  stockBatches: (StockBatch & {
    product?: {
      sku: string
      name: string
      unit: string
    }
    location?: {
      currency: string
    }
  })[]
  locations: Location[]
  userRole: string
}

export function InventoryKanban({
  stockBatches,
  locations,
  userRole,
}: InventoryKanbanProps) {
  const [activeBatch, setActiveBatch] = useState<StockBatch | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferData, setTransferData] = useState<TransferData | null>(null)

  // 데이터 그룹화 (Location별)
  const groupedBatches = groupBatchesByLocation(stockBatches)

  // HQ Location 찾기
  const hqLocation = locations.find((l) => l.location_type === 'HQ')

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveBatch(active.data.current?.batch)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveBatch(null)
      return
    }

    // Source와 Target location 추출
    const sourceBatch = active.data.current?.batch as StockBatch & {
      product?: {
        sku: string
        name: string
        unit: string
      }
    }
    const sourceLocationId = sourceBatch.location_id
    const targetLocationId = over.id.toString()

    // 같은 위치에 드롭 - 아무것도 안 함
    if (sourceLocationId === targetLocationId) {
      setActiveBatch(null)
      return
    }

    // Location 정보 가져오기
    const sourceLocation = locations.find((l) => l.id === sourceLocationId)
    const targetLocation = locations.find((l) => l.id === targetLocationId)

    if (!sourceLocation || !targetLocation) {
      toast.error('Invalid location')
      setActiveBatch(null)
      return
    }

    // 권한 체크 - HQ Admin만 이동 가능
    if (userRole !== 'HQ_Admin') {
      toast.error('Only HQ Admin can transfer stock')
      setActiveBatch(null)
      return
    }

    // HQ ↔ Branch 이동만 허용 (양방향)
    const isValidTransfer =
      (sourceLocation.location_type === 'HQ' &&
        targetLocation.location_type === 'Branch') ||
      (sourceLocation.location_type === 'Branch' &&
        targetLocation.location_type === 'HQ')

    if (!isValidTransfer) {
      toast.error('Can only transfer between HQ and Branches')
      setActiveBatch(null)
      return
    }

    // Transfer 다이얼로그 표시
    setTransferData({
      batch: sourceBatch,
      fromLocation: sourceLocation,
      toLocation: targetLocation,
      availableQty: sourceBatch.qty_on_hand, // 해당 배치의 수량
    })
    setShowTransferDialog(true)
    setActiveBatch(null)
  }

  const handleTransferSuccess = () => {
    setShowTransferDialog(false)
    setTransferData(null)
    // 페이지 새로고침으로 데이터 업데이트
    window.location.reload()
  }

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Accordion 컨테이너 */}
        <Accordion
          type="multiple"
          defaultValue={hqLocation ? [hqLocation.id] : []} // Korea HQ만 기본 펼침
          className="space-y-4"
        >
          {locations.map((location) => (
            <LocationAccordion
              key={location.id}
              location={location}
              batches={groupedBatches[location.id] || []}
              userRole={userRole}
            />
          ))}
        </Accordion>

        {/* 드래그 중 오버레이 */}
        <DragOverlay>
          {activeBatch ? <BatchCard batch={activeBatch} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Transfer 확인 다이얼로그 */}
      {showTransferDialog && transferData && (
        <TransferDialog
          open={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          transferData={transferData}
          onSuccess={handleTransferSuccess}
        />
      )}
    </>
  )
}

// TransferData 타입
interface TransferData {
  batch: StockBatch & {
    product?: {
      sku: string
      name: string
      unit: string
    }
  }
  fromLocation: Location
  toLocation: Location
  availableQty: number
}
