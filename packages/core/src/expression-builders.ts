/**
 * Expression builders for DynamoDB queries and filters
 */

import type { KeyCondition, FilterExpression } from './types'

/**
 * Result of building an expression
 */
export interface ExpressionResult {
  expression: string
  attributeNames: Record<string, string>
  attributeValues: Record<string, any>
}

/**
 * Builder for KeyConditionExpression
 */
export class KeyConditionBuilder {
  private nameCounter = 0
  private valueCounter = 0
  private names: Record<string, string> = {}
  private values: Record<string, any> = {}
  private expressions: string[] = []

  /**
   * Build a KeyConditionExpression from a KeyCondition object
   */
  build(keyCondition: KeyCondition): ExpressionResult {
    // Handle multi-attribute partition key
    if (keyCondition.multiPk) {
      this.buildMultiAttributePartitionKey(keyCondition.multiPk)
    } else if (keyCondition.pk !== undefined) {
      // Handle single-attribute partition key
      this.buildPartitionKey(keyCondition.pk)
    }

    // Handle multi-attribute sort key
    if (keyCondition.multiSk) {
      this.buildMultiAttributeSortKey(keyCondition.multiSk)
    } else if (keyCondition.sk !== undefined) {
      // Handle single-attribute sort key
      this.buildSortKey(keyCondition.sk)
    }

    return {
      expression: this.expressions.join(' AND '),
      attributeNames: this.names,
      attributeValues: this.values,
    }
  }

  /**
   * Build partition key condition (single attribute)
   */
  private buildPartitionKey(pk: string | number | Uint8Array): void {
    const nameKey = this.getNextNameKey()
    const valueKey = this.getNextValueKey()

    this.names[nameKey] = 'pk'
    this.values[valueKey] = pk
    this.expressions.push(`${nameKey} = ${valueKey}`)
  }

  /**
   * Build multi-attribute partition key condition
   */
  private buildMultiAttributePartitionKey(
    multiPk: Array<string | number | Uint8Array>
  ): void {
    for (let i = 0; i < multiPk.length; i++) {
      const nameKey = this.getNextNameKey()
      const valueKey = this.getNextValueKey()

      this.names[nameKey] = `pk${i}`
      this.values[valueKey] = multiPk[i]
      this.expressions.push(`${nameKey} = ${valueKey}`)
    }
  }

  /**
   * Build sort key condition (single attribute)
   */
  private buildSortKey(
    sk: string | number | Uint8Array | Record<string, any>
  ): void {
    const nameKey = this.getNextNameKey()
    this.names[nameKey] = 'sk'

    if (typeof sk === 'object' && !(sk instanceof Uint8Array)) {
      // Complex sort key condition
      if ('eq' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.eq
        this.expressions.push(`${nameKey} = ${valueKey}`)
      }
      if ('lt' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.lt
        this.expressions.push(`${nameKey} < ${valueKey}`)
      }
      if ('lte' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.lte
        this.expressions.push(`${nameKey} <= ${valueKey}`)
      }
      if ('gt' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.gt
        this.expressions.push(`${nameKey} > ${valueKey}`)
      }
      if ('gte' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.gte
        this.expressions.push(`${nameKey} >= ${valueKey}`)
      }
      if ('between' in sk && Array.isArray(sk.between)) {
        const valueKey1 = this.getNextValueKey()
        const valueKey2 = this.getNextValueKey()
        this.values[valueKey1] = sk.between[0]
        this.values[valueKey2] = sk.between[1]
        this.expressions.push(`${nameKey} BETWEEN ${valueKey1} AND ${valueKey2}`)
      }
      if ('beginsWith' in sk) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = sk.beginsWith
        this.expressions.push(`begins_with(${nameKey}, ${valueKey})`)
      }
    } else {
      // Simple equality
      const valueKey = this.getNextValueKey()
      this.values[valueKey] = sk
      this.expressions.push(`${nameKey} = ${valueKey}`)
    }
  }

  /**
   * Build multi-attribute sort key condition
   */
  private buildMultiAttributeSortKey(
    multiSk: Array<string | number | Uint8Array> | Record<string, any>
  ): void {
    if (Array.isArray(multiSk)) {
      // Simple equality for all attributes
      for (let i = 0; i < multiSk.length; i++) {
        const nameKey = this.getNextNameKey()
        const valueKey = this.getNextValueKey()

        this.names[nameKey] = `sk${i}`
        this.values[valueKey] = multiSk[i]
        this.expressions.push(`${nameKey} = ${valueKey}`)
      }
    } else {
      // Complex condition with operators
      if ('eq' in multiSk && Array.isArray(multiSk.eq)) {
        for (let i = 0; i < multiSk.eq.length; i++) {
          const nameKey = this.getNextNameKey()
          const valueKey = this.getNextValueKey()

          this.names[nameKey] = `sk${i}`
          this.values[valueKey] = multiSk.eq[i]
          this.expressions.push(`${nameKey} = ${valueKey}`)
        }
      }
      if ('lt' in multiSk && Array.isArray(multiSk.lt)) {
        this.buildMultiAttributeComparison(multiSk.lt, '<')
      }
      if ('lte' in multiSk && Array.isArray(multiSk.lte)) {
        this.buildMultiAttributeComparison(multiSk.lte, '<=')
      }
      if ('gt' in multiSk && Array.isArray(multiSk.gt)) {
        this.buildMultiAttributeComparison(multiSk.gt, '>')
      }
      if ('gte' in multiSk && Array.isArray(multiSk.gte)) {
        this.buildMultiAttributeComparison(multiSk.gte, '>=')
      }
      if ('between' in multiSk && Array.isArray(multiSk.between)) {
        this.buildMultiAttributeBetween(multiSk.between[0], multiSk.between[1])
      }
    }
  }

  /**
   * Build comparison expression for multi-attribute sort key
   */
  private buildMultiAttributeComparison(
    values: Array<string | number | Uint8Array>,
    operator: string
  ): void {
    // For multi-attribute comparisons, we need to compare each attribute
    // with equality for all but the last, and the operator for the last
    for (let i = 0; i < values.length; i++) {
      const nameKey = this.getNextNameKey()
      const valueKey = this.getNextValueKey()

      this.names[nameKey] = `sk${i}`
      this.values[valueKey] = values[i]

      if (i < values.length - 1) {
        // All but last use equality
        this.expressions.push(`${nameKey} = ${valueKey}`)
      } else {
        // Last uses the specified operator
        this.expressions.push(`${nameKey} ${operator} ${valueKey}`)
      }
    }
  }

  /**
   * Build BETWEEN expression for multi-attribute sort key
   */
  private buildMultiAttributeBetween(
    lower: Array<string | number | Uint8Array>,
    upper: Array<string | number | Uint8Array>
  ): void {
    // For BETWEEN with multi-attribute keys, we need to handle it carefully
    // This is a simplified implementation - full implementation would need
    // to handle partial matches properly
    const maxLength = Math.max(lower.length, upper.length)

    for (let i = 0; i < maxLength; i++) {
      const nameKey = this.getNextNameKey()
      this.names[nameKey] = `sk${i}`

      if (i < lower.length && i < upper.length) {
        if (lower[i] === upper[i]) {
          // Same value, use equality
          const valueKey = this.getNextValueKey()
          this.values[valueKey] = lower[i]
          this.expressions.push(`${nameKey} = ${valueKey}`)
        } else {
          // Different values, use BETWEEN
          const valueKey1 = this.getNextValueKey()
          const valueKey2 = this.getNextValueKey()
          this.values[valueKey1] = lower[i]
          this.values[valueKey2] = upper[i]
          this.expressions.push(`${nameKey} BETWEEN ${valueKey1} AND ${valueKey2}`)
          break // BETWEEN handles the rest
        }
      }
    }
  }

  private getNextNameKey(): string {
    return `#k${this.nameCounter++}`
  }

  private getNextValueKey(): string {
    return `:k${this.valueCounter++}`
  }
}

/**
 * Builder for FilterExpression
 */
export class FilterExpressionBuilder {
  private nameCounter = 0
  private valueCounter = 0
  private names: Record<string, string> = {}
  private values: Record<string, any> = {}
  private expressions: string[] = []

  /**
   * Build a FilterExpression from a FilterExpression object
   */
  build(filter: FilterExpression): ExpressionResult {
    for (const [field, condition] of Object.entries(filter)) {
      this.buildFieldCondition(field, condition)
    }

    return {
      expression: this.expressions.join(' AND '),
      attributeNames: this.names,
      attributeValues: this.values,
    }
  }

  /**
   * Build a condition for a single field
   */
  private buildFieldCondition(field: string, condition: any): void {
    const nameKey = this.getNextNameKey()
    this.names[nameKey] = field

    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      // Complex condition
      if ('eq' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.eq
        this.expressions.push(`${nameKey} = ${valueKey}`)
      }
      if ('ne' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.ne
        this.expressions.push(`${nameKey} <> ${valueKey}`)
      }
      if ('lt' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.lt
        this.expressions.push(`${nameKey} < ${valueKey}`)
      }
      if ('lte' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.lte
        this.expressions.push(`${nameKey} <= ${valueKey}`)
      }
      if ('gt' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.gt
        this.expressions.push(`${nameKey} > ${valueKey}`)
      }
      if ('gte' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.gte
        this.expressions.push(`${nameKey} >= ${valueKey}`)
      }
      if ('between' in condition && Array.isArray(condition.between)) {
        const valueKey1 = this.getNextValueKey()
        const valueKey2 = this.getNextValueKey()
        this.values[valueKey1] = condition.between[0]
        this.values[valueKey2] = condition.between[1]
        this.expressions.push(`${nameKey} BETWEEN ${valueKey1} AND ${valueKey2}`)
      }
      if ('in' in condition && Array.isArray(condition.in)) {
        const valueKeys = condition.in.map((val: any) => {
          const valueKey = this.getNextValueKey()
          this.values[valueKey] = val
          return valueKey
        })
        this.expressions.push(`${nameKey} IN (${valueKeys.join(', ')})`)
      }
      if ('exists' in condition) {
        if (condition.exists) {
          this.expressions.push(`attribute_exists(${nameKey})`)
        } else {
          this.expressions.push(`attribute_not_exists(${nameKey})`)
        }
      }
      if ('contains' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.contains
        this.expressions.push(`contains(${nameKey}, ${valueKey})`)
      }
      if ('beginsWith' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.beginsWith
        this.expressions.push(`begins_with(${nameKey}, ${valueKey})`)
      }
    } else {
      // Simple equality condition
      const valueKey = this.getNextValueKey()
      this.values[valueKey] = condition
      this.expressions.push(`${nameKey} = ${valueKey}`)
    }
  }

  private getNextNameKey(): string {
    return `#f${this.nameCounter++}`
  }

  private getNextValueKey(): string {
    return `:f${this.valueCounter++}`
  }
}

/**
 * Builder for ConditionExpression
 * Supports comparison operators, logical operators, and DynamoDB functions
 */
export class ConditionExpressionBuilder {
  private nameCounter = 0
  private valueCounter = 0
  private names: Record<string, string> = {}
  private values: Record<string, any> = {}

  /**
   * Build a ConditionExpression from a ConditionExpression object
   */
  build(condition: any): ExpressionResult {
    const expression = this.buildCondition(condition)

    return {
      expression,
      attributeNames: this.names,
      attributeValues: this.values,
    }
  }

  /**
   * Build a condition recursively, handling logical operators
   */
  private buildCondition(condition: any): string {
    const expressions: string[] = []

    // Process all entries in the condition object
    for (const [field, value] of Object.entries(condition)) {
      if (field === 'and' && Array.isArray(value)) {
        const subConditions = value.map((c: any) => this.buildCondition(c))
        expressions.push(`(${subConditions.join(' AND ')})`)
      } else if (field === 'or' && Array.isArray(value)) {
        const subConditions = value.map((c: any) => this.buildCondition(c))
        expressions.push(`(${subConditions.join(' OR ')})`)
      } else if (field === 'not') {
        const subCondition = this.buildCondition(value)
        expressions.push(`NOT ${subCondition}`)
      } else {
        // Regular field condition
        const fieldExpression = this.buildFieldCondition(field, value)
        if (fieldExpression) {
          expressions.push(fieldExpression)
        }
      }
    }

    // Join all expressions with AND
    if (expressions.length === 0) {
      return ''
    }
    if (expressions.length === 1) {
      return expressions[0]
    }
    return expressions.join(' AND ')
  }

  /**
   * Build a condition for a single field
   */
  private buildFieldCondition(field: string, condition: any): string {
    const nameKey = this.getNextNameKey()
    this.names[nameKey] = field

    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      // Complex condition with operators
      const expressions: string[] = []

      if ('eq' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.eq
        expressions.push(`${nameKey} = ${valueKey}`)
      }
      if ('ne' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.ne
        expressions.push(`${nameKey} <> ${valueKey}`)
      }
      if ('lt' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.lt
        expressions.push(`${nameKey} < ${valueKey}`)
      }
      if ('lte' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.lte
        expressions.push(`${nameKey} <= ${valueKey}`)
      }
      if ('gt' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.gt
        expressions.push(`${nameKey} > ${valueKey}`)
      }
      if ('gte' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.gte
        expressions.push(`${nameKey} >= ${valueKey}`)
      }
      if ('exists' in condition) {
        if (condition.exists) {
          expressions.push(`attribute_exists(${nameKey})`)
        } else {
          expressions.push(`attribute_not_exists(${nameKey})`)
        }
      }
      if ('contains' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.contains
        expressions.push(`contains(${nameKey}, ${valueKey})`)
      }
      if ('beginsWith' in condition) {
        const valueKey = this.getNextValueKey()
        this.values[valueKey] = condition.beginsWith
        expressions.push(`begins_with(${nameKey}, ${valueKey})`)
      }

      return expressions.join(' AND ')
    }

    // Simple equality condition
    const valueKey = this.getNextValueKey()
    this.values[valueKey] = condition
    return `${nameKey} = ${valueKey}`
  }

  private getNextNameKey(): string {
    return `#c${this.nameCounter++}`
  }

  private getNextValueKey(): string {
    return `:c${this.valueCounter++}`
  }
}

/**
 * Builder for ProjectionExpression
 * Handles nested attributes and expression attribute names
 */
export class ProjectionExpressionBuilder {
  private nameCounter = 0
  private names: Record<string, string> = {}

  /**
   * Build a ProjectionExpression from an array of attribute paths
   * Supports nested attributes using dot notation (e.g., 'user.email')
   */
  build(attributes: string[]): ExpressionResult {
    const projectionParts: string[] = []

    for (const attribute of attributes) {
      const projectionPart = this.buildAttributePath(attribute)
      projectionParts.push(projectionPart)
    }

    return {
      expression: projectionParts.join(', '),
      attributeNames: this.names,
      attributeValues: {}, // Projection expressions don't use values
    }
  }

  /**
   * Build a projection path for a single attribute
   * Handles nested attributes (e.g., 'user.email' becomes '#p0.#p1')
   */
  private buildAttributePath(attribute: string): string {
    // Split on dots to handle nested attributes
    const parts = attribute.split('.')
    const nameParts: string[] = []

    for (const part of parts) {
      const nameKey = this.getNextNameKey()
      this.names[nameKey] = part
      nameParts.push(nameKey)
    }

    return nameParts.join('.')
  }

  private getNextNameKey(): string {
    return `#p${this.nameCounter++}`
  }
}
