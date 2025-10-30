'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { InventoryList } from './inventory-list'
import { InventoryKanban } from './inventory-kanban'
import { LayoutGrid, Table } from 'lucide-react'
import { StockBatch, Location } from '@/types'

interface InventoryViewProps {
  inventory: (StockBatch & {
    product: {
      sku: string
      name: string
      unit: string
    }
    location: {
      name: string
      location_type: string
      currency: string
    }
  })[]
  locations: Location[]
  userRole: string
}

const STORAGE_KEY = 'inventory-view-mode'

export function InventoryView({
  inventory,
  locations,
  userRole,
}: InventoryViewProps) {
  // 초기값은 항상 'table'로 시작 (서버/클라이언트 일치)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [isClient, setIsClient] = useState(false)

  // 클라이언트에서만 localStorage 값 불러오기
  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'table' || saved === 'kanban') {
      setViewMode(saved)
    }
  }, [])

  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'table' | 'kanban') => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <>
      {/* 뷰 전환 버튼 - HQ Admin만 표시 */}
      {userRole === 'HQ_Admin' && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => handleViewModeChange('table')}
            size="sm"
          >
            <Table className="mr-2 h-4 w-4" />
            Table View
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            onClick={() => handleViewModeChange('kanban')}
            size="sm"
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban View
          </Button>
        </div>
      )}

      {/* 조건부 렌더링 */}
      {viewMode === 'table' ? (
        <InventoryList inventory={inventory} />
      ) : (
        <InventoryKanban
          stockBatches={inventory}
          locations={locations}
          userRole={userRole}
        />
      )}
    </>
  )
}
