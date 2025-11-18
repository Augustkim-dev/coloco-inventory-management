/**
 * Location Hierarchy Utility Functions
 *
 * Provides helper functions for working with hierarchical location structures
 */

import { Location, LocationTreeNode, LocationBreadcrumb } from '@/types'

// ============================================
// Tree Building Functions
// ============================================

/**
 * Converts a flat array of locations into a tree structure
 * @param locations Flat array of all locations
 * @returns Root location(s) with nested children
 */
export function buildLocationTree(locations: Location[]): LocationTreeNode[] {
  // Create a map for quick lookup
  const locationMap = new Map<string, LocationTreeNode>()

  // Initialize all nodes
  locations.forEach(location => {
    locationMap.set(location.id, {
      id: location.id,
      name: location.name,
      location_type: location.location_type as any,
      level: location.level || 1,
      parent_id: location.parent_id,
      path: location.path || '',
      display_order: location.display_order,
      currency: location.currency as any,
      country_code: location.country_code,
      is_active: location.is_active ?? true,
      children: []
    })
  })

  // Build tree structure
  const roots: LocationTreeNode[] = []

  locationMap.forEach(node => {
    if (node.parent_id === null) {
      // This is a root node (HQ)
      roots.push(node)
    } else {
      // Find parent and add as child
      const parent = locationMap.get(node.parent_id)
      if (parent) {
        parent.children.push(node)
      }
    }
  })

  // Sort children by display_order
  const sortChildren = (node: LocationTreeNode) => {
    node.children.sort((a, b) => a.display_order - b.display_order)
    node.children.forEach(sortChildren)
  }

  roots.forEach(sortChildren)
  roots.sort((a, b) => a.display_order - b.display_order)

  return roots
}

/**
 * Flattens a location tree back into an array
 * @param tree Tree of locations
 * @returns Flat array of locations
 */
export function flattenLocationTree(tree: LocationTreeNode[]): LocationTreeNode[] {
  const result: LocationTreeNode[] = []

  const traverse = (nodes: LocationTreeNode[]) => {
    nodes.forEach(node => {
      result.push(node)
      if (node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  traverse(tree)
  return result
}

// ============================================
// Ancestor/Descendant Functions
// ============================================

/**
 * Gets all ancestor locations (parent, grandparent, etc.) for a given location
 * @param locationId Target location ID
 * @param locations All locations
 * @returns Array of ancestor locations from immediate parent to root
 */
export function getAncestors(locationId: string, locations: Location[]): Location[] {
  const ancestors: Location[] = []
  const locationMap = new Map(locations.map(loc => [loc.id, loc]))

  let current = locationMap.get(locationId)

  while (current?.parent_id) {
    const parent = locationMap.get(current.parent_id)
    if (parent) {
      ancestors.push(parent)
      current = parent
    } else {
      break
    }
  }

  return ancestors
}

/**
 * Gets breadcrumb trail for a location (root to current)
 * @param locationId Target location ID
 * @param locations All locations
 * @returns Breadcrumb array from root to target
 */
export function getBreadcrumbs(locationId: string, locations: Location[]): LocationBreadcrumb[] {
  const ancestors = getAncestors(locationId, locations)
  const current = locations.find(loc => loc.id === locationId)

  if (!current) return []

  const breadcrumbs: LocationBreadcrumb[] = ancestors
    .reverse()
    .map(loc => ({
      id: loc.id,
      name: loc.name,
      level: loc.level || 1
    }))

  breadcrumbs.push({
    id: current.id,
    name: current.name,
    level: current.level || 1
  })

  return breadcrumbs
}

/**
 * Gets all descendant locations (children, grandchildren, etc.) for a given location
 * @param locationId Parent location ID
 * @param locations All locations
 * @returns Array of all descendant locations
 */
export function getDescendants(locationId: string, locations: Location[]): Location[] {
  const descendants: Location[] = []
  const locationMap = new Map(locations.map(loc => [loc.id, loc]))

  const traverse = (parentId: string) => {
    locations.forEach(loc => {
      if (loc.parent_id === parentId) {
        descendants.push(loc)
        traverse(loc.id)
      }
    })
  }

  traverse(locationId)
  return descendants
}

/**
 * Gets direct children only (not grandchildren)
 * @param locationId Parent location ID
 * @param locations All locations
 * @returns Array of direct child locations
 */
export function getDirectChildren(locationId: string, locations: Location[]): Location[] {
  return locations.filter(loc => loc.parent_id === locationId)
}

// ============================================
// Validation Functions
// ============================================

/**
 * Checks if a location is an ancestor of another location
 * @param ancestorId Potential ancestor location ID
 * @param descendantId Potential descendant location ID
 * @param locations All locations
 * @returns true if ancestorId is an ancestor of descendantId
 */
export function isAncestor(
  ancestorId: string,
  descendantId: string,
  locations: Location[]
): boolean {
  const ancestors = getAncestors(descendantId, locations)
  return ancestors.some(loc => loc.id === ancestorId)
}

/**
 * Checks if a location is a descendant of another location
 * @param descendantId Potential descendant location ID
 * @param ancestorId Potential ancestor location ID
 * @param locations All locations
 * @returns true if descendantId is a descendant of ancestorId
 */
export function isDescendant(
  descendantId: string,
  ancestorId: string,
  locations: Location[]
): boolean {
  return isAncestor(ancestorId, descendantId, locations)
}

/**
 * Checks if two locations are direct parent-child
 * @param parentId Potential parent ID
 * @param childId Potential child ID
 * @param locations All locations
 * @returns true if they are direct parent-child
 */
export function isDirectParentChild(
  parentId: string,
  childId: string,
  locations: Location[]
): boolean {
  const child = locations.find(loc => loc.id === childId)
  return child?.parent_id === parentId
}

/**
 * Validates if stock transfer is allowed between two locations
 * Only allows direct parent-child transfers (forward or reverse)
 * @param fromId Source location ID
 * @param toId Destination location ID
 * @param locations All locations
 * @returns { valid: boolean, reason?: string }
 */
export function canTransferBetween(
  fromId: string,
  toId: string,
  locations: Location[]
): { valid: boolean; reason?: string } {
  // Same location
  if (fromId === toId) {
    return { valid: false, reason: 'Cannot transfer to the same location' }
  }

  const fromLocation = locations.find(loc => loc.id === fromId)
  const toLocation = locations.find(loc => loc.id === toId)

  if (!fromLocation || !toLocation) {
    return { valid: false, reason: 'Location not found' }
  }

  // Check if from is parent of to (forward transfer)
  if (toLocation.parent_id === fromId) {
    return { valid: true }
  }

  // Check if to is parent of from (reverse transfer)
  if (fromLocation.parent_id === toId) {
    return { valid: true }
  }

  // Not a direct parent-child relationship
  return {
    valid: false,
    reason: 'Transfer only allowed between direct parent and child locations'
  }
}

// ============================================
// Path Functions
// ============================================

/**
 * Builds materialized path for a location
 * @param locationId Location ID
 * @param locations All locations
 * @returns Path string like '/HQ/Vietnam/Ho_Chi_Minh'
 */
export function buildMaterializedPath(locationId: string, locations: Location[]): string {
  const ancestors = getAncestors(locationId, locations)
  const current = locations.find(loc => loc.id === locationId)

  if (!current) return ''

  const pathParts = ancestors
    .reverse()
    .map(loc => loc.name.replace(/\s+/g, '_'))

  pathParts.push(current.name.replace(/\s+/g, '_'))

  return '/' + pathParts.join('/')
}

/**
 * Gets location depth/level in hierarchy
 * @param locationId Location ID
 * @param locations All locations
 * @returns Depth (1 for HQ, 2 for Branch, etc.)
 */
export function getLocationDepth(locationId: string, locations: Location[]): number {
  const location = locations.find(loc => loc.id === locationId)
  if (!location) return 0

  if (location.level) return location.level

  // Calculate from ancestors if level not set
  const ancestors = getAncestors(locationId, locations)
  return ancestors.length + 1
}

// ============================================
// Filter Functions
// ============================================

/**
 * Gets all locations accessible by a user based on their role and location
 * @param userLocationId User's assigned location ID
 * @param userRole User's role
 * @param locations All locations
 * @returns Array of accessible locations
 */
export function getAccessibleLocations(
  userLocationId: string | null,
  userRole: string,
  locations: Location[]
): Location[] {
  // HQ Admin can access all
  if (userRole === 'HQ_Admin') {
    return locations
  }

  if (!userLocationId) return []

  // Branch Manager can access their location + all descendants
  if (userRole === 'Branch_Manager') {
    const userLocation = locations.find(loc => loc.id === userLocationId)
    const descendants = getDescendants(userLocationId, locations)
    return userLocation ? [userLocation, ...descendants] : descendants
  }

  // SubBranch Manager can only access their own location
  if (userRole === 'SubBranch_Manager') {
    const userLocation = locations.find(loc => loc.id === userLocationId)
    return userLocation ? [userLocation] : []
  }

  return []
}

/**
 * Gets locations that can be selected as transfer destination
 * @param sourceLocationId Source location ID
 * @param userLocationId User's location ID
 * @param userRole User's role
 * @param locations All locations
 * @returns Array of valid destination locations
 */
export function getValidTransferDestinations(
  sourceLocationId: string,
  userLocationId: string | null,
  userRole: string,
  locations: Location[]
): Location[] {
  const accessible = getAccessibleLocations(userLocationId, userRole, locations)

  return accessible.filter(loc => {
    if (loc.id === sourceLocationId) return false
    const validation = canTransferBetween(sourceLocationId, loc.id, locations)
    return validation.valid
  })
}

/**
 * Filters locations by type
 * @param locations All locations
 * @param type Location type to filter by
 * @returns Filtered locations
 */
export function filterByType(locations: Location[], type: string): Location[] {
  return locations.filter(loc => loc.location_type === type)
}

/**
 * Filters locations by level
 * @param locations All locations
 * @param level Hierarchy level (1, 2, 3, etc.)
 * @returns Filtered locations
 */
export function filterByLevel(locations: Location[], level: number): Location[] {
  return locations.filter(loc => loc.level === level)
}

// ============================================
// Display Functions
// ============================================

/**
 * Gets indented name for display in flat list
 * @param location Location
 * @param indentChar Character to use for indentation
 * @returns Indented name string
 */
export function getIndentedName(location: Location, indentChar: string = '  '): string {
  const level = location.level || 1
  const indent = indentChar.repeat(level - 1)
  return `${indent}${location.name}`
}

/**
 * Sorts locations by path for hierarchical display
 * @param locations Locations to sort
 * @returns Sorted locations
 */
export function sortByPath(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => {
    const pathA = a.path || ''
    const pathB = b.path || ''
    return pathA.localeCompare(pathB)
  })
}

/**
 * Sorts locations by display_order
 * @param locations Locations to sort
 * @returns Sorted locations
 */
export function sortByDisplayOrder(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => a.display_order - b.display_order)
}
