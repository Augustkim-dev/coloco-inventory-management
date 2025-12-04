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
import { canTransferBetween, getDescendants } from '@/lib/hierarchy-utils'
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
  userLocationId?: string | null
}

export function InventoryKanban({
  stockBatches,
  locations,
  userRole,
  userLocationId,
}: InventoryKanbanProps) {
  const [activeBatch, setActiveBatch] = useState<StockBatch | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferData, setTransferData] = useState<TransferData | null>(null)

  // 데이터 그룹화 (Location별)
  const groupedBatches = groupBatchesByLocation(stockBatches)

  // Branch Manager인 경우 자신의 Branch + Sub-Branch만 필터링
  const filteredLocations = (userRole === 'Branch_Manager' && userLocationId
    ? locations.filter(loc => {
        // 자신의 location이거나 하위 location인 경우만 표시
        if (loc.id === userLocationId) return true
        const descendants = getDescendants(userLocationId, locations)
        return descendants.some(d => d.id === loc.id)
      })
    : locations
  ).sort((a, b) => {
    // path 기준 정렬로 계층 구조 유지
    const pathA = a.path || ''
    const pathB = b.path || ''
    return pathA.localeCompare(pathB)
  })

  // HQ Location 찾기 (HQ Admin용)
  const hqLocation = locations.find((l) => l.location_type === 'HQ')

  // Branch Manager인 경우 자신의 Branch를 기본 펼침
  const defaultOpenLocations = userRole === 'Branch_Manager' && userLocationId
    ? [userLocationId]
    : hqLocation ? [hqLocation.id] : []

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

    // 권한 체크 - HQ Admin과 Branch Manager만 이동 가능
    if (userRole !== 'HQ_Admin' && userRole !== 'Branch_Manager') {
      toast.error('Only HQ Admin and Branch Manager can transfer stock')
      setActiveBatch(null)
      return
    }

    // Branch Manager는 자신의 Location에서만 이동 가능
    if (userRole === 'Branch_Manager' && sourceLocationId !== userLocationId) {
      toast.error('You can only transfer from your own location')
      setActiveBatch(null)
      return
    }

    // 계층적 이동 규칙 검증 (직접 부모-자식 관계만 허용)
    const transferValidation = canTransferBetween(
      sourceLocationId,
      targetLocationId,
      locations
    )

    if (!transferValidation.valid) {
      toast.error(transferValidation.reason || 'Invalid transfer')
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
          defaultValue={defaultOpenLocations}
          className="space-y-4"
        >
          {filteredLocations.map((location) => (
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
