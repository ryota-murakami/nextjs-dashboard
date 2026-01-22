/**
 * Drizzle seed script for local development.
 * Usage: pnpm db:seed
 */
import bcrypt from 'bcrypt'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { customers, invoices, revenue, users } from './schema'

// Placeholder data
const usersData = [
  {
    id: '410544b2-4001-4271-9855-fec4b6a6442a',
    name: 'User',
    email: 'user@nextmail.com',
    password: '123456',
  },
]

const customersData = [
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    name: 'Delba de Oliveira',
    email: 'delba@oliveira.com',
    imageUrl: '/customers/delba-de-oliveira.png',
  },
  {
    id: '3958dc9e-742f-4377-85e9-fec4b6a6442a',
    name: 'Lee Robinson',
    email: 'lee@robinson.com',
    imageUrl: '/customers/lee-robinson.png',
  },
  {
    id: '3958dc9e-737f-4377-85e9-fec4b6a6442a',
    name: 'Hector Simpson',
    email: 'hector@simpson.com',
    imageUrl: '/customers/hector-simpson.png',
  },
  {
    id: '50ca3e18-62cd-11ee-8c99-0242ac120002',
    name: 'Steven Tey',
    email: 'steven@tey.com',
    imageUrl: '/customers/steven-tey.png',
  },
  {
    id: '3958dc9e-787f-4377-85e9-fec4b6a6442a',
    name: 'Steph Dietz',
    email: 'steph@dietz.com',
    imageUrl: '/customers/steph-dietz.png',
  },
  {
    id: '76d65c26-f784-44a2-ac19-586678f7c2f2',
    name: 'Michael Novotny',
    email: 'michael@novotny.com',
    imageUrl: '/customers/michael-novotny.png',
  },
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    name: 'Evil Rabbit',
    email: 'evil@rabbit.com',
    imageUrl: '/customers/evil-rabbit.png',
  },
  {
    id: '126eed9c-c90c-4ef6-a4a8-fcf7408d3c66',
    name: 'Emil Kowalski',
    email: 'emil@kowalski.com',
    imageUrl: '/customers/emil-kowalski.png',
  },
  {
    id: 'CC27C14A-0ACF-4F4A-A6C9-D45682C144B9',
    name: 'Amy Burns',
    email: 'amy@burns.com',
    imageUrl: '/customers/amy-burns.png',
  },
  {
    id: '13D07535-C59E-4157-A011-F8D2EF4E0CBB',
    name: 'Balazs Orban',
    email: 'balazs@orban.com',
    imageUrl: '/customers/balazs-orban.png',
  },
]

const invoicesData = [
  {
    customerId: customersData[0].id,
    amount: 15795,
    status: 'pending' as const,
    date: '2022-12-06',
  },
  {
    customerId: customersData[1].id,
    amount: 20348,
    status: 'pending' as const,
    date: '2022-11-14',
  },
  {
    customerId: customersData[4].id,
    amount: 3040,
    status: 'paid' as const,
    date: '2022-10-29',
  },
  {
    customerId: customersData[3].id,
    amount: 44800,
    status: 'paid' as const,
    date: '2023-09-10',
  },
  {
    customerId: customersData[5].id,
    amount: 34577,
    status: 'pending' as const,
    date: '2023-08-05',
  },
  {
    customerId: customersData[7].id,
    amount: 54246,
    status: 'pending' as const,
    date: '2023-07-16',
  },
  {
    customerId: customersData[6].id,
    amount: 666,
    status: 'pending' as const,
    date: '2023-06-27',
  },
  {
    customerId: customersData[3].id,
    amount: 32545,
    status: 'paid' as const,
    date: '2023-06-09',
  },
  {
    customerId: customersData[4].id,
    amount: 1250,
    status: 'paid' as const,
    date: '2023-06-17',
  },
  {
    customerId: customersData[5].id,
    amount: 8546,
    status: 'paid' as const,
    date: '2023-06-07',
  },
  {
    customerId: customersData[1].id,
    amount: 500,
    status: 'paid' as const,
    date: '2023-08-19',
  },
  {
    customerId: customersData[5].id,
    amount: 8945,
    status: 'paid' as const,
    date: '2023-06-03',
  },
  {
    customerId: customersData[2].id,
    amount: 8945,
    status: 'paid' as const,
    date: '2023-06-18',
  },
  {
    customerId: customersData[0].id,
    amount: 8945,
    status: 'paid' as const,
    date: '2023-10-04',
  },
  {
    customerId: customersData[2].id,
    amount: 1000,
    status: 'paid' as const,
    date: '2022-06-05',
  },
]

const revenueData = [
  { month: 'Jan', revenue: 2000 },
  { month: 'Feb', revenue: 1800 },
  { month: 'Mar', revenue: 2200 },
  { month: 'Apr', revenue: 2500 },
  { month: 'May', revenue: 2300 },
  { month: 'Jun', revenue: 3200 },
  { month: 'Jul', revenue: 3500 },
  { month: 'Aug', revenue: 3700 },
  { month: 'Sep', revenue: 2500 },
  { month: 'Oct', revenue: 2800 },
  { month: 'Nov', revenue: 3000 },
  { month: 'Dec', revenue: 4800 },
]

async function main() {
  const connectionString =
    process.env.POSTGRES_URL ||
    'postgres://dashboard:dashboard123@localhost:54320/dashboard'

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  console.log('Seeding database...')

  // Create tables using raw SQL (since we're not using migrations)
  await client`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

  await client`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `
  console.log('Created users table')

  await client`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    )
  `
  console.log('Created customers table')

  await client`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    )
  `
  console.log('Created invoices table')

  await client`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    )
  `
  console.log('Created revenue table')

  // Seed users
  for (const user of usersData) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        email: user.email,
        password: hashedPassword,
      })
      .onConflictDoNothing()
  }
  console.log(`Seeded ${usersData.length} users`)

  // Seed customers
  await db.insert(customers).values(customersData).onConflictDoNothing()
  console.log(`Seeded ${customersData.length} customers`)

  // Seed invoices
  await db.insert(invoices).values(invoicesData).onConflictDoNothing()
  console.log(`Seeded ${invoicesData.length} invoices`)

  // Seed revenue
  await db.insert(revenue).values(revenueData).onConflictDoNothing()
  console.log(`Seeded ${revenueData.length} revenue records`)

  console.log('Database seeded successfully!')

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error seeding database:', err)
  process.exit(1)
})
