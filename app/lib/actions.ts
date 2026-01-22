'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { signIn } from '@/auth'
import { db, invoices } from '@/db'

export type State = {
  errors?: {
    customerId?: string[]
    amount?: string[]
    status?: string[]
  }
  message?: string | null
}

/**
 * Authenticates user with credentials.
 * @param prevState - Previous state from useFormState
 * @param formData - Form data containing email and password
 * @returns Error message string if authentication fails
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', Object.fromEntries(formData))
  } catch (error) {
    if ((error as Error).message.includes('CredentialsSignin')) {
      return 'CredentialsSignin'
    }
    throw error
  }
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { error: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    error: 'Please select an invoice status.',
  }),
  date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true })

/**
 * Creates a new invoice.
 * @param prevState - Previous state from useFormState
 * @param formData - Form data containing customerId, amount, and status
 * @returns Validation errors or redirects on success
 */
export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    }
  }

  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100
  const date = new Date().toISOString().split('T')[0]

  try {
    await db.insert(invoices).values({
      customerId,
      amount: amountInCents,
      status,
      date,
    })
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    }
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true })

/**
 * Updates an existing invoice.
 * @param id - Invoice UUID to update
 * @param prevState - Previous state from useFormState
 * @param formData - Form data containing customerId, amount, and status
 * @returns Validation errors or redirects on success
 */
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    }
  }

  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100

  try {
    await db
      .update(invoices)
      .set({
        customerId,
        amount: amountInCents,
        status,
      })
      .where(eq(invoices.id, id))
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' }
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

/**
 * Deletes an invoice by ID.
 * @param id - Invoice UUID to delete
 */
export async function deleteInvoice(id: string): Promise<void> {
  try {
    await db.delete(invoices).where(eq(invoices.id, id))
    revalidatePath('/dashboard/invoices')
  } catch (error) {
    console.error('Database Error: Failed to Delete Invoice.', error)
  }
}
