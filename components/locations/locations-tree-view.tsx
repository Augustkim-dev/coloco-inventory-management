'use client'

import { useState } from 'react'
import { Location, LocationTreeNode } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, ChevronDown, Edit, Building2, MapPin } from 'lucide-react'
import { buildLocationTree } from '@/lib/hierarchy-utils'

// Helper function to check if user can edit a location
function canEditLocation(
  node: LocationTreeNode,
  userRole?: string,
  userLocationId?: string | null
): boolean {
  // HQ Admin can edit all locations
  if (userRole === 'HQ_Admin') {
    return true
  }

  // Branch Manager can edit:
  // 1. Their own branch (if location_id matches)
  // 2. Sub-branches under their branch (parent_location_id matches their branch)
  if (userRole === 'Branch_Manager' && userLocationId) {
    // Can edit their own branch
    if (node.id === userLocationId) {
      return true
    }
    // Can edit sub-branches under their branch
    if (node.parent_location_id === userLocationId && node.location_type === 'SubBranch') {
      return true
    }
  }

  return false
}

interface LocationsTreeViewProps {
  locations: Location[]
  userRole?: string
  userLocationId?: string | null
}

interface TreeNodeProps {
  node: LocationTreeNode
  depth?: number
  userRole?: string
  userLocationId?: string | null
}

function TreeNode({ node, depth = 0, userRole, userLocationId }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'HQ':
        return <Building2 className="h-4 w-4 text-blue-600" />
      case 'Branch':
        return <MapPin className="h-4 w-4 text-green-600" />
      case 'SubBranch':
        return <MapPin className="h-4 w-4 text-amber-600" />
      default:
        return <MapPin className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'HQ':
        return 'default'
      case 'Branch':
        return 'secondary'
      case 'SubBranch':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div>
      {/* Node Row */}
      <div
        className={`flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors ${
          depth > 0 ? 'ml-8' : ''
        }`}
        style={{ marginLeft: depth > 0 ? `${depth * 2}rem` : '0' }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-center h-6 w-6 rounded hover:bg-muted ${
            !hasChildren ? 'invisible' : ''
          }`}
          disabled={!hasChildren}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))}
        </button>

        {/* Location Icon */}
        <div className="flex items-center justify-center">{getLocationIcon(node.location_type)}</div>

        {/* Location Name */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{node.name}</div>
          <div className="text-xs text-muted-foreground">
            {node.country_code} • {node.currency}
            {node.level > 1 && ` • Level ${node.level}`}
          </div>
        </div>

        {/* Type Badge */}
        <Badge variant={getTypeBadgeVariant(node.location_type) as any}>
          {node.location_type}
        </Badge>

        {/* Children Count */}
        {hasChildren && (
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
          </div>
        )}

        {/* Active Status */}
        {!node.is_active && (
          <Badge variant="destructive" className="text-xs">
            Inactive
          </Badge>
        )}

        {/* Edit Button */}
        {canEditLocation(node, userRole, userLocationId) && (
          <Link href={`/locations/${node.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Children Nodes */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children
            .sort((a, b) => a.display_order - b.display_order)
            .map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                userRole={userRole}
                userLocationId={userLocationId}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function LocationsTreeView({
  locations,
  userRole,
  userLocationId,
}: LocationsTreeViewProps) {
  // Build tree structure
  const tree = buildLocationTree(locations)

  if (tree.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No locations found</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 space-y-2">
      {tree.map((rootNode) => (
        <TreeNode
          key={rootNode.id}
          node={rootNode}
          depth={0}
          userRole={userRole}
          userLocationId={userLocationId}
        />
      ))}
    </div>
  )
}
