"use client"

import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSidebar } from "@/hooks/use-sidebar"
import { useSettings } from "@/hooks/use-settings"
import { ModernPageLoading } from "@/components/ui/modern-loader"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed, toggle } = useSidebar()
  const { isLoading: settingsLoading } = useSettings()

  if (settingsLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center" suppressHydrationWarning>
        <ModernPageLoading />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
