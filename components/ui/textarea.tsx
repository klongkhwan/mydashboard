import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:focus-visible:ring-destructive aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-background text-foreground px-3 py-2 text-base transition-colors duration-(--motion-fast) outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
