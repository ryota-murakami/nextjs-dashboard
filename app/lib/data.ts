import { unstable_noStore as noStore } from 'next/cache'
import { count, desc, eq, ilike, or, sql, sum } from 'drizzle-orm'

import { db, customers, invoices, revenue, users } from '@/db'

import type {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions'
import { formatCurrency } from './utils'

/**
 * Fetches all revenue data from the database.
 * @returns Array of monthly revenue records
 */
export async function fetchRevenue(): Promise<Revenue[]> {
  noStore()
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const data = await db.select().from(revenue)

    console.log('Data fetch complete after 3 seconds.')

    return data
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch revenue data.')
  }
}

/**
 * Fetches the 5 most recent invoices with customer details.
 * @returns Array of latest invoices with formatted amounts
 */
export async function fetchLatestInvoices() {
  noStore()
  try {
    const data = await db
      .select({
        amount: invoices.amount,
        name: customers.name,
        image_url: customers.imageUrl,
        email: customers.email,
        id: invoices.id,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .orderBy(desc(invoices.date))
      .limit(5)

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }))
    return latestInvoices
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch the latest invoices.')
  }
}

/**
 * Fetches dashboard card data including totals and counts.
 * @returns Object containing invoice/customer counts and totals
 */
export async function fetchCardData() {
  noStore()
  try {
    const [invoiceCountResult, customerCountResult, invoiceStatusResult] =
      await Promise.all([
        db.select({ count: count() }).from(invoices),
        db.select({ count: count() }).from(customers),
        db
          .select({
            paid: sum(
              sql`CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.amount} ELSE 0 END`,
            ),
            pending: sum(
              sql`CASE WHEN ${invoices.status} = 'pending' THEN ${invoices.amount} ELSE 0 END`,
            ),
          })
          .from(invoices),
      ])

    const numberOfInvoices = invoiceCountResult[0]?.count ?? 0
    const numberOfCustomers = customerCountResult[0]?.count ?? 0
    const totalPaidInvoices = formatCurrency(
      Number(invoiceStatusResult[0]?.paid ?? 0),
    )
    const totalPendingInvoices = formatCurrency(
      Number(invoiceStatusResult[0]?.pending ?? 0),
    )

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    }
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch card data.')
  }
}

const ITEMS_PER_PAGE = 6

/**
 * Fetches paginated invoices filtered by search query.
 * @param query - Search string to filter by customer name, email, amount, date, or status
 * @param currentPage - Current page number (1-indexed)
 * @returns Array of filtered invoices for the current page
 */
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
): Promise<InvoicesTable[]> {
  noStore()
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const searchPattern = `%${query}%`

  try {
    const data = await db
      .select({
        id: invoices.id,
        amount: invoices.amount,
        date: invoices.date,
        status: invoices.status,
        name: customers.name,
        email: customers.email,
        image_url: customers.imageUrl,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(sql`${invoices.amount}::text`, searchPattern),
          ilike(sql`${invoices.date}::text`, searchPattern),
          ilike(invoices.status, searchPattern),
        ),
      )
      .orderBy(desc(invoices.date))
      .limit(ITEMS_PER_PAGE)
      .offset(offset)

    return data.map((row) => ({
      ...row,
      customer_id: '', // Not needed for display
      status: row.status as 'pending' | 'paid',
    }))
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch invoices.')
  }
}

/**
 * Calculates total pages for filtered invoices.
 * @param query - Search string to filter invoices
 * @returns Total number of pages
 */
export async function fetchInvoicesPages(query: string): Promise<number> {
  noStore()
  const searchPattern = `%${query}%`

  try {
    const result = await db
      .select({ count: count() })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(sql`${invoices.amount}::text`, searchPattern),
          ilike(sql`${invoices.date}::text`, searchPattern),
          ilike(invoices.status, searchPattern),
        ),
      )

    const totalPages = Math.ceil((result[0]?.count ?? 0) / ITEMS_PER_PAGE)
    return totalPages
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch total number of invoices.')
  }
}

/**
 * Fetches a single invoice by ID for editing.
 * @param id - Invoice UUID
 * @returns Invoice form data with amount in dollars (not cents)
 */
export async function fetchInvoiceById(
  id: string,
): Promise<InvoiceForm | undefined> {
  noStore()
  try {
    const data = await db
      .select({
        id: invoices.id,
        customer_id: invoices.customerId,
        amount: invoices.amount,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, id))

    const invoice = data[0]
    if (!invoice) return undefined

    return {
      ...invoice,
      status: invoice.status as 'pending' | 'paid',
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch invoice.')
  }
}

/**
 * Fetches all customers for dropdown selection.
 * @returns Array of customer id/name pairs sorted alphabetically
 */
export async function fetchCustomers(): Promise<CustomerField[]> {
  noStore()
  try {
    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .orderBy(customers.name)

    return data
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch all customers.')
  }
}

/**
 * Fetches customers with invoice aggregations, filtered by search query.
 * @param query - Search string to filter by customer name or email
 * @returns Array of customers with total invoices and amounts
 */
export async function fetchFilteredCustomers(query: string) {
  noStore()
  const searchPattern = `%${query}%`

  try {
    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        image_url: customers.imageUrl,
        total_invoices: count(invoices.id),
        total_pending: sum(
          sql`CASE WHEN ${invoices.status} = 'pending' THEN ${invoices.amount} ELSE 0 END`,
        ),
        total_paid: sum(
          sql`CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.amount} ELSE 0 END`,
        ),
      })
      .from(customers)
      .leftJoin(invoices, eq(customers.id, invoices.customerId))
      .where(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern),
        ),
      )
      .groupBy(
        customers.id,
        customers.name,
        customers.email,
        customers.imageUrl,
      )
      .orderBy(customers.name)

    const result = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(Number(customer.total_pending ?? 0)),
      total_paid: formatCurrency(Number(customer.total_paid ?? 0)),
    }))

    return result
  } catch (error) {
    console.error('Database Error:', error)
    throw new Error('Failed to fetch customer table.')
  }
}

/**
 * Fetches a user by email for authentication.
 * @param email - User email address
 * @returns User record or undefined if not found
 */
export async function getUser(email: string): Promise<User | undefined> {
  noStore()
  try {
    const data = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return data[0]
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw new Error('Failed to fetch user.')
  }
}
