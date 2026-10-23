import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-(--motion-fast) cursor-pointer disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-busy:cursor-wait [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground font-bold hover:bg-primary-hover',
        pill:
          'bg-primary text-primary-foreground font-bold uppercase tracking-wider px-6 rounded-full hover:bg-primary-hover text-xs',
        'pill-secondary':
          'bg-secondary text-secondary-foreground hover:bg-surface-hover px-6 rounded-full font-bold uppercase tracking-wider text-xs border border-border',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-transparent hover:bg-muted text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-surface-hover border border-border',
        ghost:
          'hover:bg-surface-hover text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary/90',
        glass:
          'bg-card/80 backdrop-blur-md border border-border text-foreground shadow-card hover:bg-card hover:border-primary/30',
      },
      size: {
        default: 'h-control px-4 py-2 has-[>svg]:px-3',
        sm: 'h-control-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-control-lg px-6 has-[>svg]:px-4',
        icon: 'size-control',
        pill: 'h-control px-5 rounded-full text-xs font-bold uppercase tracking-wider',
        'pill-lg': 'h-control-lg px-8 rounded-full text-sm font-bold uppercase tracking-wider',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

