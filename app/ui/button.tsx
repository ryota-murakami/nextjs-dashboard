import clsx from 'clsx'
import { useFormStatus } from 'react-dom'

import Spinner from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function Button({ children, className, ...rest }: ButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button
      {...rest}
      className={clsx(
        'flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors',
      )}
    >
      {pending ? <Spinner /> : null}
      <span className="mx-2">{children}</span>
    </button>
  )
}
