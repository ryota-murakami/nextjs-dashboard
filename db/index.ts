import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const connectionString = process.env.POSTGRES_URL!

/**
 * PostgreSQL client for query execution
 * - max: 1 for serverless environments to prevent connection pooling issues
 */
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 1,
})

/**
 * Drizzle ORM instance with schema for type-safe queries
 */
export const db = drizzle(client, { schema })

export * from './schema'
