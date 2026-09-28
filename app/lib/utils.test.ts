import { describe, expect, test } from 'vitest'

import { formatCurrency, generatePagination } from './utils'

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

describe('invoice pagination', () => {
  test('shows every page when the result fits without an ellipsis', () => {
    // Arrange
    const currentPage = 3
    const totalPages = 7

    // Act
    const pages = generatePagination(currentPage, totalPages)

    // Assert
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('keeps the first pages and final two pages visible near the beginning', () => {
    // Arrange
    const currentPage = 2
    const totalPages = 12

    // Act
    const pages = generatePagination(currentPage, totalPages)

    // Assert
    expect(pages).toEqual([1, 2, 3, '...', 11, 12])
  })

  test('shows neighboring pages around a middle selection', () => {
    // Arrange
    const currentPage = 6
    const totalPages = 12

    // Act
    const pages = generatePagination(currentPage, totalPages)

    // Assert
    expect(pages).toEqual([1, '...', 5, 6, 7, '...', 12])
  })

  test('keeps the first two pages and final pages visible near the end', () => {
    // Arrange
    const currentPage = 11
    const totalPages = 12

    // Act
    const pages = generatePagination(currentPage, totalPages)

    // Assert
    expect(pages).toEqual([1, 2, '...', 10, 11, 12])
  })
})
