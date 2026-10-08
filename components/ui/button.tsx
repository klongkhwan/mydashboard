import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-primary/30 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-black font-bold shadow-play hover:bg-[#1fdf64] hover:scale-[1.02] active:scale-95',
        pill:
          'bg-primary text-black font-bold uppercase tracking-wider px-6 rounded-full hover:bg-[#1fdf64] hover:scale-[1.03] active:scale-95 shadow-play text-xs',
        'pill-secondary':
          'bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] px-6 rounded-full font-bold uppercase tracking-wider active:scale-95 text-xs border border-white/5',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 active:scale-95',
        outline:
          'border border-white/15 bg-transparent shadow-xs hover:bg-white/5 hover:border-white/30 text-foreground active:scale-95',
        secondary:
          'bg-[#1f1f1f] text-white shadow-xs hover:bg-[#282828] border border-white/5 active:scale-95',
        ghost:
          'hover:bg-[#282828] text-muted-foreground hover:text-foreground active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary/90',
        glass:
          'bg-card/80 backdrop-blur-md border border-white/10 text-foreground shadow-lg hover:bg-card hover:border-primary/30',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        pill: 'h-9 px-5 rounded-full text-xs font-bold uppercase tracking-wider',
        'pill-lg': 'h-11 px-8 rounded-full text-sm font-bold uppercase tracking-wider',
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

