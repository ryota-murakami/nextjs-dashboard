import type { Metadata } from 'next'

import { fetchFilteredCustomers } from '@/app/lib/data'
import CustomersTable from '@/app/ui/customers/table'

export const metadata: Metadata = {
  title: 'Customers',
}

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string
    page?: string
  }
}) {
  const query = searchParams?.query || ''

  const customers = await fetchFilteredCustomers(query)

  return (
    <main>
      <CustomersTable customers={customers} />
    </main>
  )
}
