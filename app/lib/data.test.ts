import { beforeEach, describe, expect, test, vi } from 'vitest'

import { db, customers, invoices } from '@/db'
import {
  fetchCardData,
  fetchFilteredInvoices,
  fetchLatestInvoices,
  fetchInvoicesPages,
  fetchInvoiceById,
  fetchFilteredCustomers,
  getUser,
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
  revenue: {},
  users: { email: 'user-email' },
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
  leftJoin: ReturnType<typeof vi.fn>
  groupBy: ReturnType<typeof vi.fn>
}

function createSelectQuery(result: unknown[]): SelectQuery {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
  }

  for (const method of [
    query.from,
    query.innerJoin,
    query.where,
    query.orderBy,
    query.limit,
    query.offset,
    query.leftJoin,
    query.groupBy,
  ]) {
    method.mockReturnValue(query)
  }
  query.offset.mockImplementation(() => Promise.resolve(result))
  query.limit.mockImplementation(() => query)
  query.groupBy.mockImplementation(() => query)

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

  test.each([
    { page: 1, offset: 0 },
    { page: 2, offset: 6 },
  ])(
    'shows the correct invoice slice on page $page without changing row values',
    async ({ page, offset }) => {
      // Arrange
      const invoiceRows: InvoiceRow[] = [
        {
          id: 'invoice-page-boundary',
          amount: 4200,
          date: '2026-09-28',
          status: 'paid',
          name: 'Grace Hopper',
          email: 'grace@example.com',
          image_url: '/customers/grace.png',
        },
      ]
      const query = createSelectQuery(invoiceRows)

      // Act
      const result = await fetchFilteredInvoices('Grace', page)

      // Assert
      expect(query.limit).toHaveBeenCalledWith(6)
      expect(query.offset).toHaveBeenCalledWith(offset)
      expect(result).toEqual([
        {
          ...invoiceRows[0],
          customer_id: '',
          status: 'paid',
        },
      ])
    },
  )

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

  test.each([
    { invoiceCount: 6, expectedPages: 1 },
    { invoiceCount: 7, expectedPages: 2 },
    { invoiceCount: 13, expectedPages: 3 },
  ])(
    'shows $expectedPages pages for $invoiceCount matching invoices',
    async ({ invoiceCount, expectedPages }) => {
      // Arrange
      const query = createSelectQuery([])
      query.where.mockResolvedValue([{ count: invoiceCount }])

      // Act
      const totalPages = await fetchInvoicesPages('paid')

      // Assert
      expect(totalPages).toBe(expectedPages)
      expect(query.where).toHaveBeenCalledOnce()
    },
  )

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

  test('limits latest invoices to five and formats stored cents for display', async () => {
    // Arrange
    const latestRows = [
      {
        id: 'invoice-latest',
        amount: 12345,
        name: 'Grace Hopper',
        image_url: '/customers/grace.png',
        email: 'grace@example.com',
      },
    ]
    const query = createSelectQuery(latestRows)
    query.limit.mockImplementation(() => Promise.resolve(latestRows))

    // Act
    const result = await fetchLatestInvoices()

    // Assert
    expect(query.limit).toHaveBeenCalledWith(5)
    expect(result).toEqual([
      {
        ...latestRows[0],
        amount: '$123.45',
      },
    ])
  })

  test('formats missing card aggregates as zero without failing the dashboard', async () => {
    // Arrange
    const invoiceCountQuery = createSelectQuery([])
    const customerCountQuery = createSelectQuery([])
    const totalsQuery = createSelectQuery([])
    vi.mocked(db.select)
      .mockReturnValueOnce(invoiceCountQuery as never)
      .mockReturnValueOnce(customerCountQuery as never)
      .mockReturnValueOnce(totalsQuery as never)

    // Act
    const result = await fetchCardData()

    // Assert
    expect(result).toEqual({
      numberOfCustomers: 0,
      numberOfInvoices: 0,
      totalPaidInvoices: '$0.00',
      totalPendingInvoices: '$0.00',
    })
  })

  test('formats customer invoice totals while preserving customers with no invoices', async () => {
    // Arrange
    const customersWithTotals = [
      {
        id: 'customer-123',
        name: 'Katherine Johnson',
        email: 'katherine@example.com',
        image_url: '/customers/katherine.png',
        total_invoices: 2,
        total_pending: 0,
        total_paid: 2450,
      },
      {
        id: 'customer-456',
        name: 'Dorothy Vaughan',
        email: 'dorothy@example.com',
        image_url: '/customers/dorothy.png',
        total_invoices: 0,
        total_pending: null,
        total_paid: null,
      },
    ]
    const query = createSelectQuery(customersWithTotals)
    query.orderBy.mockImplementation(() => Promise.resolve(customersWithTotals))

    // Act
    const result = await fetchFilteredCustomers('')

    // Assert
    expect(query.leftJoin).toHaveBeenCalled()
    expect(query.groupBy).toHaveBeenCalled()
    expect(result).toEqual([
      {
        ...customersWithTotals[0],
        total_pending: '$0.00',
        total_paid: '$24.50',
      },
      {
        ...customersWithTotals[1],
        total_pending: '$0.00',
        total_paid: '$0.00',
      },
    ])
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

  test('finds only the first user matching the sign-in email', async () => {
    // Arrange
    const user = {
      id: 'user-123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'hashed-password',
    }
    const query = createSelectQuery([])
    query.limit.mockResolvedValue([user])

    // Act
    const result = await getUser('ada@example.com')

    // Assert
    expect(query.where).toHaveBeenCalledWith('equal:user-email:ada@example.com')
    expect(query.limit).toHaveBeenCalledWith(1)
    expect(result).toEqual(user)
  })
})
