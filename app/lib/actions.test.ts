import { AuthError } from 'next-auth'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { signIn } from '@/auth'
import { authenticate } from './actions'

vi.mock('@/auth', () => ({ signIn: vi.fn() }))
vi.mock('@/db', () => ({ db: {}, invoices: {} }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    type = 'AuthError'
  },
}))

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
