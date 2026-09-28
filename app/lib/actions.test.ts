import { AuthError } from 'next-auth'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { db, invoices } from '@/db'
import { signIn } from '@/auth'
import {
  authenticate,
  createInvoice,
  deleteInvoice,
  updateInvoice,
} from './actions'

vi.mock('@/auth', () => ({ signIn: vi.fn() }))
vi.mock('@/db', () => ({
  db: {
    delete: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  invoices: { id: 'invoice-id' },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    type = 'AuthError'
  },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'invoice condition') }))

describe('credential authentication', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset()
  })

  test('returns the credentials error while preserving submitted fields', async () => {
    // Arrange
    const credentialsError = Object.assign(new AuthError(), {
      type: 'CredentialsSignin',
    })
    vi.mocked(signIn).mockRejectedValue(credentialsError)
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'incorrect-password')
    formData.set('redirectTo', '/dashboard/invoices')

    // Act
    const result = await authenticate(undefined, formData)

    // Assert
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'incorrect-password',
      redirectTo: '/dashboard/invoices',
    })
    expect(result).toBe('CredentialsSignin')
  })

  test('rethrows authentication errors that are not credential failures', async () => {
    // Arrange
    const authenticationError = Object.assign(new AuthError(), {
      type: 'AccessDenied',
    })
    vi.mocked(signIn).mockRejectedValue(authenticationError)

    // Act
    const attempt = authenticate(undefined, new FormData())

    // Assert
    await expect(attempt).rejects.toBe(authenticationError)
  })
})

describe('invoice server actions', () => {
  beforeEach(() => {
    vi.mocked(db.insert).mockReset()
    vi.mocked(db.update).mockReset()
    vi.mocked(db.delete).mockReset()
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn() } as never)
    vi.mocked(redirect).mockReset()
    vi.mocked(revalidatePath).mockReset()
  })

  test('rejects invalid invoice fields without writing to the database', async () => {
    // Arrange
    const formData = new FormData()
    formData.set('customerId', 'customer-id')
    formData.set('amount', '0')
    formData.set('status', 'refunded')

    // Act
    const result = await createInvoice({}, formData)

    // Assert
    expect(result).toEqual({
      errors: {
        amount: ['Please enter an amount greater than $0.'],
        status: ['Please select an invoice status.'],
      },
      message: 'Missing Fields. Failed to Create Invoice.',
    })
    expect(db.insert).not.toHaveBeenCalled()
  })

  test('persists invoice amounts as cents before redirecting', async () => {
    // Arrange
    const values = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({ values } as never)
    const formData = new FormData()
    formData.set('customerId', 'customer-123')
    formData.set('amount', '12.50')
    formData.set('status', 'pending')
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    // Act
    const attempt = createInvoice({}, formData)

    // Assert
    await expect(attempt).rejects.toThrow('NEXT_REDIRECT')
    expect(db.insert).toHaveBeenCalledWith(invoices)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-123',
        amount: 1250,
        status: 'pending',
        date: expect.any(String),
      }),
    )
    expect(redirect).toHaveBeenCalledWith('/dashboard/invoices')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices')
  })

  test('updates invoice cents and revalidates the invoice list', async () => {
    // Arrange
    const where = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn().mockReturnValue({ where })
    vi.mocked(db.update).mockReturnValue({ set } as never)
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
    const formData = new FormData()
    formData.set('customerId', 'customer-456')
    formData.set('amount', '8.75')
    formData.set('status', 'paid')

    // Act
    const attempt = updateInvoice('invoice-123', {}, formData)

    // Assert
    await expect(attempt).rejects.toThrow('NEXT_REDIRECT')
    expect(set).toHaveBeenCalledWith({
      customerId: 'customer-456',
      amount: 875,
      status: 'paid',
    })
    expect(where).toHaveBeenCalledWith('invoice condition')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices')
    expect(redirect).toHaveBeenCalledWith('/dashboard/invoices')
  })

  test('deletes an invoice and refreshes the invoice list', async () => {
    // Arrange
    const where = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.delete).mockReturnValue({ where } as never)

    // Act
    await deleteInvoice('invoice-789')

    // Assert
    expect(db.delete).toHaveBeenCalledWith(invoices)
    expect(where).toHaveBeenCalledWith('invoice condition')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices')
  })
})
