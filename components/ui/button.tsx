import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-primary/30 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]',
        destructive:
          'bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25 hover:opacity-90',
        outline:
          'border border-primary/30 bg-transparent shadow-xs hover:bg-primary/10 hover:border-primary/50 text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 border border-border',
        ghost:
          'hover:bg-secondary text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline hover:text-accent',
        glass:
          'bg-card/80 backdrop-blur-md border border-primary/20 text-foreground shadow-lg hover:bg-card hover:shadow-primary/20',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
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
