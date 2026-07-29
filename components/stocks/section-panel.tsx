import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-white/5 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        {eyebrow && <p className="text-spotify-label">{eyebrow}</p>}
        <h1 className={cn("text-spotify-title", eyebrow && "mt-2")}>{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-spotify-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

interface SectionLabelProps {
  children: ReactNode
  hint?: string
}

// Groups related panels so a long page reads as a few sections instead of a stack of cards.
export function SectionLabel({ children, hint }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-spotify-label whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-white/5" />
      {hint && <span className="whitespace-nowrap text-xs text-[#6a6a6a]">{hint}</span>}
    </div>
  )
}

interface SectionPanelProps {
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
    <section className={cn("flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-[#b3b3b3]">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
