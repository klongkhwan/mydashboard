"use client"

import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSidebar } from "@/hooks/use-sidebar"
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed, toggle } = useSidebar()

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-black/20 to-background">
          {children}
        </main>
      </div>
    </div>
  )
}
