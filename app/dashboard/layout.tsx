"use client"

import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSidebar } from "@/hooks/use-sidebar"
import { useSettings } from "@/hooks/use-settings"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed, toggle } = useSidebar()
  const { isLoading: settingsLoading } = useSettings()

  // ถ้า settings กำลังโหลด แสดง loading state
  if (settingsLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
