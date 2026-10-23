import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, variant = 'default', ...props }: React.ComponentProps<'input'> & {
  variant?: 'default' | 'pill'
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-control w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base text-foreground transition-colors duration-(--motion-fast)',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'md:text-sm',
        variant === 'pill' && 'h-control-lg rounded-full px-4 py-2',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
