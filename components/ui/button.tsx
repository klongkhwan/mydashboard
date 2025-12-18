import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[#39FF14]/30 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#39FF14] to-[#10B981] text-[#0D0F0D] font-semibold shadow-lg shadow-[#39FF14]/25 hover:shadow-[#39FF14]/40 hover:scale-[1.02]',
        destructive:
          'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:from-red-500 hover:to-rose-500',
        outline:
          'border border-[#39FF14]/30 bg-transparent shadow-xs hover:bg-[#39FF14]/10 hover:border-[#39FF14]/50 text-[#E5E5E5]',
        secondary:
          'bg-[#1A1C1A] text-[#E5E5E5] shadow-xs hover:bg-[#262826] border border-[#262826]',
        ghost:
          'hover:bg-[#1A1C1A] text-[#8C8C8C] hover:text-[#E5E5E5]',
        link: 'text-[#39FF14] underline-offset-4 hover:underline hover:text-[#10B981]',
        glass:
          'bg-[#1A1C1A]/80 backdrop-blur-md border border-[#39FF14]/20 text-[#E5E5E5] shadow-lg hover:bg-[#1A1C1A] hover:shadow-[#39FF14]/20',
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
