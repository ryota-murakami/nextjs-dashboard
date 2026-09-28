import { describe, expect, test } from 'vitest'

import {
  formatCurrency,
  formatDateToLocal,
  generatePagination,
  generateYAxis,
} from './utils'

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

describe('invoice date formatting', () => {
  test('formats an ISO date with the requested locale', () => {
    // Arrange
    const date = '2025-01-05'

    // Act
    const formattedDate = formatDateToLocal(date, 'en-US')

    // Assert
    expect(formattedDate).toBe('Jan 5, 2025')
  })

  test('keeps the displayed calendar day when the date string has no time zone', () => {
    // Arrange
    const date = '2025-12-31'

    // Act
    const formattedDate = formatDateToLocal(date, 'en-US')

    // Assert
    expect(formattedDate).toBe('Dec 31, 2025')
  })
})

describe('revenue chart y-axis labels', () => {
  test('rounds the highest revenue up to the next thousand', () => {
    // Arrange
    const revenue = [
      { month: 'Jan', revenue: 4_500 },
      { month: 'Feb', revenue: 2_000 },
    ]

    // Act
    const axis = generateYAxis(revenue)

    // Assert
    expect(axis).toEqual({
      yAxisLabels: ['$5K', '$4K', '$3K', '$2K', '$1K', '$0K'],
      topLabel: 5_000,
    })
  })

  test('uses the zero label when no revenue rows are available', () => {
    // Arrange
    const revenue: { month: string; revenue: number }[] = []

    // Act
    const axis = generateYAxis(revenue)

    // Assert
    expect(axis).toEqual({ yAxisLabels: ['$0K'], topLabel: 0 })
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
