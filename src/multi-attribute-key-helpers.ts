/**
 * Helper functions for working with multi-attribute composite keys
 */

/**
 * Create a multi-attribute key value array
 * This is a simple helper that returns the values as-is, but provides
 * a clear API for constructing multi-attribute keys
 * 
 * @param values - Array of values for the multi-attribute key
 * @returns The same array of values
 * 
 * @example
 * ```typescript
 * const key = multiAttributeKey(['TENANT-123', 'CUSTOMER-456', 'DEPT-A'])
 * ```
 */
export function multiAttributeKey(
  ...values: Array<string | number | Uint8Array>
): Array<string | number | Uint8Array> {
  return values
}

/**
 * Create a multi-tenant partition key with tenant and customer IDs
 * Supports optional department ID for additional partitioning
 * 
 * @param tenantId - Tenant identifier
 * @param customerId - Customer identifier
 * @param departmentId - Optional department identifier
 * @returns Array of key values
 * 
 * @example
 * ```typescript
 * // Two-level multi-tenant key
 * const key = multiTenantKey('TENANT-123', 'CUSTOMER-456')
 * // Returns: ['TENANT-123', 'CUSTOMER-456']
 * 
 * // Three-level multi-tenant key with department
 * const key = multiTenantKey('TENANT-123', 'CUSTOMER-456', 'DEPT-A')
 * // Returns: ['TENANT-123', 'CUSTOMER-456', 'DEPT-A']
 * ```
 */
export function multiTenantKey(
  tenantId: string,
  customerId: string,
  departmentId?: string
): Array<string> {
  const key = [tenantId, customerId]
  if (departmentId !== undefined) {
    key.push(departmentId)
  }
  return key
}

/**
 * Create a hierarchical multi-attribute key for nested data structures
 * Filters out undefined values to support partial hierarchies
 * 
 * @param level1 - First level of hierarchy (required)
 * @param level2 - Second level of hierarchy (optional)
 * @param level3 - Third level of hierarchy (optional)
 * @param level4 - Fourth level of hierarchy (optional)
 * @returns Array of key values (up to 4 levels)
 * 
 * @example
 * ```typescript
 * // Full hierarchy
 * const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco', 'Downtown')
 * // Returns: ['USA', 'CA', 'San Francisco', 'Downtown']
 * 
 * // Partial hierarchy
 * const key = hierarchicalMultiKey('USA', 'CA')
 * // Returns: ['USA', 'CA']
 * 
 * // Single level
 * const key = hierarchicalMultiKey('USA')
 * // Returns: ['USA']
 * ```
 */
export function hierarchicalMultiKey(
  level1: string,
  level2?: string,
  level3?: string,
  level4?: string
): Array<string> {
  const key: Array<string> = [level1]

  if (level2 !== undefined) {
    key.push(level2)
  }
  if (level3 !== undefined) {
    key.push(level3)
  }
  if (level4 !== undefined) {
    key.push(level4)
  }

  return key
}

/**
 * Create a time-series multi-attribute key with category and timestamp
 * Supports optional subcategory for additional granularity
 * 
 * @param category - Primary category (e.g., 'ERROR', 'INFO', 'WARNING')
 * @param timestamp - Unix timestamp or Date object
 * @param subcategory - Optional subcategory for finer grouping
 * @returns Array of key values with category, timestamp, and optional subcategory
 * 
 * @example
 * ```typescript
 * // Basic time-series key
 * const key = timeSeriesMultiKey('ERROR', new Date('2025-12-02'))
 * // Returns: ['ERROR', 1733097600000]
 * 
 * // With subcategory
 * const key = timeSeriesMultiKey('ERROR', 1733097600000, 'DATABASE')
 * // Returns: ['ERROR', 1733097600000, 'DATABASE']
 * 
 * // For range queries
 * const startKey = timeSeriesMultiKey('ERROR', new Date('2025-12-01'))
 * const endKey = timeSeriesMultiKey('ERROR', new Date('2025-12-31'))
 * ```
 */
export function timeSeriesMultiKey(
  category: string,
  timestamp: Date | number,
  subcategory?: string
): Array<string | number> {
  const timestampValue = timestamp instanceof Date ? timestamp.getTime() : timestamp
  const key: Array<string | number> = [category, timestampValue]

  if (subcategory !== undefined) {
    key.push(subcategory)
  }

  return key
}

/**
 * Create a location-based multi-attribute key
 * Supports country, state/province, city, and optional district
 * 
 * @param country - Country code or name
 * @param state - State, province, or region (optional)
 * @param city - City name (optional)
 * @param district - District or neighborhood (optional)
 * @returns Array of location values
 * 
 * @example
 * ```typescript
 * // Full location
 * const key = locationMultiKey('USA', 'CA', 'San Francisco', 'SOMA')
 * // Returns: ['USA', 'CA', 'San Francisco', 'SOMA']
 * 
 * // Partial location (country and state)
 * const key = locationMultiKey('USA', 'CA')
 * // Returns: ['USA', 'CA']
 * 
 * // Country only
 * const key = locationMultiKey('USA')
 * // Returns: ['USA']
 * ```
 */
export function locationMultiKey(
  country: string,
  state?: string,
  city?: string,
  district?: string
): Array<string> {
  const key: Array<string> = [country]

  if (state !== undefined) {
    key.push(state)
  }
  if (city !== undefined) {
    key.push(city)
  }
  if (district !== undefined) {
    key.push(district)
  }

  return key
}

/**
 * Create a product categorization multi-attribute key
 * Supports category, subcategory, brand, and optional product line
 * 
 * @param category - Top-level category
 * @param subcategory - Subcategory (optional)
 * @param brand - Brand name (optional)
 * @param productLine - Product line or series (optional)
 * @returns Array of categorization values
 * 
 * @example
 * ```typescript
 * // Full categorization
 * const key = productCategoryMultiKey('Electronics', 'Laptops', 'Apple', 'MacBook Pro')
 * // Returns: ['Electronics', 'Laptops', 'Apple', 'MacBook Pro']
 * 
 * // Category and subcategory
 * const key = productCategoryMultiKey('Electronics', 'Laptops')
 * // Returns: ['Electronics', 'Laptops']
 * ```
 */
export function productCategoryMultiKey(
  category: string,
  subcategory?: string,
  brand?: string,
  productLine?: string
): Array<string> {
  const key: Array<string> = [category]

  if (subcategory !== undefined) {
    key.push(subcategory)
  }
  if (brand !== undefined) {
    key.push(brand)
  }
  if (productLine !== undefined) {
    key.push(productLine)
  }

  return key
}

/**
 * Create a status and priority multi-attribute key
 * Useful for task management, order processing, etc.
 * 
 * @param status - Status value (e.g., 'PENDING', 'ACTIVE', 'COMPLETED')
 * @param priority - Priority level (number or string)
 * @param assignee - Optional assignee identifier
 * @returns Array of status/priority values
 * 
 * @example
 * ```typescript
 * // Status and priority
 * const key = statusPriorityMultiKey('PENDING', 1)
 * // Returns: ['PENDING', 1]
 * 
 * // With assignee
 * const key = statusPriorityMultiKey('ACTIVE', 2, 'USER-123')
 * // Returns: ['ACTIVE', 2, 'USER-123']
 * ```
 */
export function statusPriorityMultiKey(
  status: string,
  priority: number | string,
  assignee?: string
): Array<string | number> {
  const key: Array<string | number> = [status, priority]

  if (assignee !== undefined) {
    key.push(assignee)
  }

  return key
}

/**
 * Create a version-based multi-attribute key
 * Useful for document versioning, API versioning, etc.
 * 
 * @param major - Major version number
 * @param minor - Minor version number (optional)
 * @param patch - Patch version number (optional)
 * @param build - Build number or identifier (optional)
 * @returns Array of version values
 * 
 * @example
 * ```typescript
 * // Semantic version
 * const key = versionMultiKey(2, 1, 5)
 * // Returns: [2, 1, 5]
 * 
 * // With build number
 * const key = versionMultiKey(2, 1, 5, 'beta-3')
 * // Returns: [2, 1, 5, 'beta-3']
 * 
 * // Major version only
 * const key = versionMultiKey(2)
 * // Returns: [2]
 * ```
 */
export function versionMultiKey(
  major: number,
  minor?: number,
  patch?: number,
  build?: string | number
): Array<number | string> {
  const key: Array<number | string> = [major]

  if (minor !== undefined) {
    key.push(minor)
  }
  if (patch !== undefined) {
    key.push(patch)
  }
  if (build !== undefined) {
    key.push(build)
  }

  return key
}
