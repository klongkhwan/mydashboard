"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartNoAxesCombined, FolderCog, Landmark, ReceiptText, WalletCards } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard/my-wealth", label: "Overview", icon: ChartNoAxesCombined },
  { href: "/dashboard/my-wealth/investments", label: "Investments", icon: Landmark },
  { href: "/dashboard/my-wealth/income", label: "Income", icon: WalletCards },
  { href: "/dashboard/my-wealth/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/dashboard/my-wealth/categories", label: "Categories", icon: FolderCog },
]


export function MyWealthTabs() {
  const pathname = usePathname()
  return <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-card/50 p-2 sm:flex sm:flex-wrap">
    {items.map((item) => {
      const active = pathname === item.href
      return <Link key={item.href} href={item.href} className={cn("flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-primary text-primary-foreground shadow-sm" : "text-spotify-muted hover:bg-muted hover:text-foreground")}><item.icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>
    })}
  </nav>
}