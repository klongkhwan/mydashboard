"use client"

import type React from "react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSidebar } from "@/hooks/use-sidebar"
import { useIsMobile } from "@/components/ui/use-mobile"
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed, toggle } = useSidebar()
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const [mobileMenu, setMobileMenu] = useState({ path: pathname, open: false })
  if (mobileMenu.path !== pathname) {
    setMobileMenu({ path: pathname, open: false })
  }
  const mobileMenuOpen = isMobile && mobileMenu.path === pathname && mobileMenu.open

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="w-16 shrink-0 md:w-auto max-md:overflow-hidden">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-[var(--z-navigation)] bg-overlay"
            onClick={() => setMobileMenu({ path: pathname, open: false })}
          />
        )}
        <div className={isMobile ? "fixed inset-y-0 left-0 z-[var(--z-navigation)]" : "h-full"}>
          <Sidebar
            isCollapsed={isMobile ? !mobileMenuOpen : isCollapsed}
            onToggle={isMobile ? () => setMobileMenu({ path: pathname, open: !mobileMenuOpen }) : toggle}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-black/20 to-background">
          {children}
        </main>
      </div>
    </div>
  )
}
