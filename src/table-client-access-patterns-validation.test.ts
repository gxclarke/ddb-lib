/**
 * Tests for access pattern validation with multi-attribute keys
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { AccessPatternDefinitions } from './types'

describe('TableClient - Access Pattern Validation', () => {
  test('should validate multi-attribute partition key against GSI config', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByTenant: {
        index: 'TenantIndex',
        gsiConfig: {
          indexName: 'TenantIndex',
          partitionKey: {
            attributes: [
              { name: 'tenantId', type: 'string' },
              { name: 'customerId', type: 'string' },
            ],
          },
        },
        keyCondition: (params: { tenantId: string; customerId: string }) => ({
          multiPk: [params.tenantId, params.customerId],
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    // This should not throw - valid multi-attribute key
    try {
      await client.executePattern('getUsersByTenant', {
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })
    } catch (error: any) {
      // Query will fail because we don't have a real DynamoDB, but validation should pass
      expect(error.message).not.toContain('INVALID_MULTI_ATTRIBUTE_KEY')
    }
  })

  test('should throw error for too many partition key values', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByTenant: {
        index: 'TenantIndex',
        gsiConfig: {
          indexName: 'TenantIndex',
          partitionKey: {
            attributes: [
              { name: 'tenantId', type: 'string' },
            ],
          },
        },
        keyCondition: (params: { tenantId: string; customerId: string }) => ({
          multiPk: [params.tenantId, params.customerId], // Too many values - config expects 1
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByTenant', {
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      // Should fail validation before query
      expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      expect(error.message).toContain('too many values')
    }
  })

  test('should validate multi-attribute sort key against GSI config', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByLocation: {
        index: 'LocationIndex',
        gsiConfig: {
          indexName: 'LocationIndex',
          partitionKey: {
            attributes: [{ name: 'tenantId', type: 'string' }],
          },
          sortKey: {
            attributes: [
              { name: 'country', type: 'string' },
              { name: 'state', type: 'string' },
              { name: 'city', type: 'string' },
            ],
          },
        },
        keyCondition: (params: {
          tenantId: string
          country: string
          state: string
        }) => ({
          multiPk: [params.tenantId],
          multiSk: [params.country, params.state],
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByLocation', {
        tenantId: 'TENANT-123',
        country: 'USA',
        state: 'CA',
      })
    } catch (error: any) {
      // Query will fail, but validation should pass
      expect(error.message).not.toContain('INVALID_MULTI_ATTRIBUTE_KEY')
    }
  })

  test('should throw error for wrong type in partition key', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByTenant: {
        index: 'TenantIndex',
        gsiConfig: {
          indexName: 'TenantIndex',
          partitionKey: {
            attributes: [
              { name: 'tenantId', type: 'string' },
              { name: 'customerId', type: 'number' },
            ],
          },
        },
        keyCondition: (params: { tenantId: string; customerId: any }) => ({
          multiPk: [params.tenantId, params.customerId],
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByTenant', {
        tenantId: 'TENANT-123',
        customerId: 'not-a-number', // Should be number
      })
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      expect(error.message).toContain('must be a number')
    }
  })

  test('should validate sort key with comparison operators', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByLocation: {
        index: 'LocationIndex',
        gsiConfig: {
          indexName: 'LocationIndex',
          partitionKey: {
            attributes: [{ name: 'tenantId', type: 'string' }],
          },
          sortKey: {
            attributes: [
              { name: 'country', type: 'string' },
              { name: 'state', type: 'string' },
            ],
          },
        },
        keyCondition: (params: { tenantId: string; country: string; state: string }) => ({
          multiPk: [params.tenantId],
          multiSk: { gte: [params.country, params.state] },
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByLocation', {
        tenantId: 'TENANT-123',
        country: 'USA',
        state: 'CA',
      })
    } catch (error: any) {
      // Query will fail, but validation should pass
      expect(error.message).not.toContain('INVALID_MULTI_ATTRIBUTE_KEY')
    }
  })

  test('should validate sort key with between operator', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByLocation: {
        index: 'LocationIndex',
        gsiConfig: {
          indexName: 'LocationIndex',
          partitionKey: {
            attributes: [{ name: 'tenantId', type: 'string' }],
          },
          sortKey: {
            attributes: [
              { name: 'country', type: 'string' },
              { name: 'state', type: 'string' },
            ],
          },
        },
        keyCondition: (params: {
          tenantId: string
          countryFrom: string
          stateFrom: string
          countryTo: string
          stateTo: string
        }) => ({
          multiPk: [params.tenantId],
          multiSk: {
            between: [
              [params.countryFrom, params.stateFrom],
              [params.countryTo, params.stateTo],
            ],
          },
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByLocation', {
        tenantId: 'TENANT-123',
        countryFrom: 'USA',
        stateFrom: 'CA',
        countryTo: 'USA',
        stateTo: 'NY',
      })
    } catch (error: any) {
      // Query will fail, but validation should pass
      expect(error.message).not.toContain('INVALID_MULTI_ATTRIBUTE_KEY')
    }
  })

  test('should work without GSI config (no validation)', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByTenant: {
        index: 'TenantIndex',
        // No gsiConfig - validation skipped
        keyCondition: (params: { tenantId: string; customerId: string }) => ({
          multiPk: [params.tenantId, params.customerId],
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByTenant', {
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })
    } catch (error: any) {
      // Query will fail, but no validation errors
      expect(error.code).not.toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
    }
  })

  test('should throw error when using multi-attribute key with single-attribute GSI config', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByTenant: {
        index: 'TenantIndex',
        gsiConfig: {
          indexName: 'TenantIndex',
          partitionKey: 'gsi1pk', // Single-attribute
        },
        keyCondition: (params: { tenantId: string; customerId: string }) => ({
          multiPk: [params.tenantId, params.customerId], // Multi-attribute
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('getUsersByTenant', {
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('multi-attribute partition key')
      expect(error.message).toContain('single-attribute partition key')
    }
  })
})
