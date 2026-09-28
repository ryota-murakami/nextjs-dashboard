import { beforeEach, describe, expect, test, vi } from 'vitest'

import { db, customers, invoices } from '@/db'
import {
  fetchFilteredInvoices,
  fetchInvoicesPages,
  fetchInvoiceById,
} from './data'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
  customers: {
    email: 'customer-email',
    imageUrl: 'customer-image',
    name: 'customer-name',
  },
  invoices: {
    amount: 'invoice-amount',
    customerId: 'invoice-customer-id',
    date: 'invoice-date',
    id: 'invoice-id',
    status: 'invoice-status',
  },
}))

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  count: vi.fn(() => 'count-expression'),
  desc: vi.fn((column) => `descending:${column}`),
  eq: vi.fn((left, right) => `equal:${left}:${right}`),
  ilike: vi.fn((column, pattern) => `ilike:${column}:${pattern}`),
  or: vi.fn((...conditions) => ({ conditions })),
  sql: vi.fn((strings) => strings.join('')),
  sum: vi.fn(() => 'sum-expression'),
}))

type InvoiceRow = {
  id: string
  amount: number
  date: string
  status: string
  name: string
  email: string
  image_url: string
}

type SelectQuery = {
  from: ReturnType<typeof vi.fn>
  innerJoin: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  offset: ReturnType<typeof vi.fn>
}

function createSelectQuery(result: unknown[]): SelectQuery {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  }

  for (const method of [
    query.from,
    query.innerJoin,
    query.where,
    query.orderBy,
    query.limit,
    query.offset,
  ]) {
    method.mockReturnValue(query)
  }
  query.offset.mockImplementation(() => Promise.resolve(result))

  vi.mocked(db.select).mockReturnValue(query as never)
  return query
}

describe('invoice data queries', () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
  })

  test('applies the requested filter and page before returning invoice rows', async () => {
    // Arrange
    const invoiceRows: InvoiceRow[] = [
      {
        id: 'invoice-123',
        amount: 1250,
        date: '2026-09-20',
        status: 'pending',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        image_url: '/customers/ada.png',
      },
    ]
    const query = createSelectQuery(invoiceRows)

    // Act
    const result = await fetchFilteredInvoices('Ada', 3)

    // Assert
    expect(query.where).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          'ilike:customer-name:%Ada%',
          'ilike:customer-email:%Ada%',
          'ilike:invoice-status:%Ada%',
        ]),
      }),
    )
    expect(query.limit).toHaveBeenCalledWith(6)
    expect(query.offset).toHaveBeenCalledWith(12)
    expect(result).toEqual([
      {
        ...invoiceRows[0],
        customer_id: '',
        status: 'pending',
      },
    ])
    expect(customers.name).toBe('customer-name')
    expect(invoices.date).toBe('invoice-date')
  })

  test('returns zero pages when no filtered invoices are found', async () => {
    // Arrange
    const query = createSelectQuery([])
    query.offset.mockImplementation(() => Promise.resolve([{ count: 0 }]))

    // Act
    const totalPages = await fetchInvoicesPages('no-match')

    // Assert
    expect(query.where).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          'ilike:customer-name:%no-match%',
          'ilike:customer-email:%no-match%',
          'ilike:invoice-status:%no-match%',
        ]),
      }),
    )
    expect(totalPages).toBe(0)
  })

  test('converts stored invoice cents to dollars for the edit form', async () => {
    // Arrange
    const query = createSelectQuery([
      {
        id: 'invoice-456',
        customer_id: 'customer-456',
        amount: 875,
        status: 'paid',
      },
    ])
    query.where.mockImplementation(() =>
      Promise.resolve([
        {
          id: 'invoice-456',
          customer_id: 'customer-456',
          amount: 875,
          status: 'paid',
        },
      ]),
    )

    // Act
    const result = await fetchInvoiceById('invoice-456')

    // Assert
    expect(query.where).toHaveBeenCalledWith('equal:invoice-id:invoice-456')
    expect(result).toEqual({
      id: 'invoice-456',
      customer_id: 'customer-456',
      amount: 8.75,
      status: 'paid',
    })
  })

  test('returns undefined when an invoice does not exist', async () => {
    // Arrange
    createSelectQuery([])

    // Act
    const result = await fetchInvoiceById('missing-invoice')

    // Assert
    expect(result).toBeUndefined()
  })

  test('reports the filtered invoice query failure without exposing database details', async () => {
    // Arrange
    const databaseError = new Error('private connection detail')
    const query = createSelectQuery([])
    query.offset.mockRejectedValue(databaseError)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    const attempt = fetchFilteredInvoices('Ada', 1)

    // Assert
    await expect(attempt).rejects.toThrow('Failed to fetch invoices.')
    expect(consoleError).toHaveBeenCalledWith('Database Error:', databaseError)
    consoleError.mockRestore()
  })
})
