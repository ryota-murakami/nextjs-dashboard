import {
  integer,
  pgTable,
  text,
  uuid,
  varchar,
  date,
} from 'drizzle-orm/pg-core'

/**
 * Users table - stores authentication credentials
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
})

/**
 * Customers table - stores customer information
 */
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
})

/**
 * Invoices table - stores invoice data with customer reference
 */
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull(),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 255 })
    .notNull()
    .$type<'pending' | 'paid'>(),
  date: date('date').notNull(),
})

/**
 * Revenue table - stores monthly revenue data
 */
export const revenue = pgTable('revenue', {
  month: varchar('month', { length: 4 }).notNull().unique(),
  revenue: integer('revenue').notNull(),
})

// Type exports for use in application code
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type Revenue = typeof revenue.$inferSelect
export type NewRevenue = typeof revenue.$inferInsert
