import { describe, expect, test } from 'vitest'

import { formatCurrency } from './utils'

describe('invoice currency formatting', () => {
  test('formats cents as a US dollar amount', () => {
    // Arrange
    const amountInCents = 1575

    // Act
    const formattedAmount = formatCurrency(amountInCents)

    // Assert
    expect(formattedAmount).toBe('$15.75')
  })

  test('formats zero cents as a zero dollar amount', () => {
    // Arrange
    const amountInCents = 0

    // Act
    const formattedAmount = formatCurrency(amountInCents)

    // Assert
    expect(formattedAmount).toBe('$0.00')
  })
})
