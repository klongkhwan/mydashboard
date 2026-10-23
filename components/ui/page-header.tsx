import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action, className, children }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 border-b border-white/5 pb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="text-spotify-label text-primary">{eyebrow}</p>}
          <h1 className={cn("text-spotify-title", eyebrow && "mt-1.5")}>{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-spotify-muted text-sm leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0 flex items-center gap-3">{action}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </header>
  )
}

export interface SectionLabelProps {
  children: ReactNode
  hint?: string
  className?: string
}

// Groups related panels so a long page reads as a few sections instead of a stack of cards.
export function SectionLabel({ children, hint, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-3 my-4", className)}>
      <span className="text-spotify-label whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-white/5" />
      {hint && <span className="whitespace-nowrap text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export interface SectionPanelProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function SectionPanel({ title, description, icon: Icon, action, className, bodyClassName, children }: SectionPanelProps) {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded-xl border border-white/10 bg-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
