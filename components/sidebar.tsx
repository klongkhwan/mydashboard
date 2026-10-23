"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Settings,
  Bitcoin,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  TrendingUp,
  CreditCard,
  Clapperboard,
  FileText,
  ChevronDown,
  Folder,
  BookHeart,
  Search,
  LayoutGrid,
  Dumbbell,
  GraduationCap,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/app/login/actions"
import Link from "next/link"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    allowedRoles: ["user", "admin"],
  },
  {
    title: "My Wealth",
    icon: TrendingUp,
    allowedRoles: ["user", "admin"],
    subItems: [
      { title: "Overview", icon: LayoutDashboard, href: "/dashboard/my-wealth" },
      { title: "Investments", icon: TrendingUp, href: "/dashboard/my-wealth/investments" },
      { title: "Workouts", icon: Dumbbell, href: "/dashboard/my-wealth/workouts" },
      { title: "Personal Growth", icon: GraduationCap, href: "/dashboard/my-wealth/growth" },
      { title: "Income & Expense", icon: CreditCard, href: "/dashboard/my-wealth/transactions" },
    ],
  },

  {
    title: "Investment",
    icon: Activity,
    allowedRoles: ["user", "admin"],
    subItems: [
      { title: "Market Overview", icon: Activity, href: "/dashboard/investment" },
      { title: "Crypto", icon: Bitcoin, href: "/dashboard/investment/crypto" },
      { title: "Stocks", icon: LayoutGrid, href: "/dashboard/investment/stocks" },
      { title: "Calendar", icon: Clock, href: "/dashboard/investment/calendar" },
      { title: "Chart", icon: TrendingUp, href: "/dashboard/investment/chart" },
    ],
  },
  {
    title: "API Scheduler",
    icon: Clock,
    href: "/dashboard/api-scheduler",
    allowedRoles: ["admin"],
  },
  {
    title: "Subscription",
    icon: CreditCard,
    href: "/dashboard/subscriptions",
    allowedRoles: ["user", "admin"],
  },

  {
    title: "Programs",
    icon: Folder,
    allowedRoles: ["user", "admin"],
    subItems: [
      {
        title: "Edit Clip",
        icon: Clapperboard,
        href: "/dashboard/programs/edit-clip",
      },
      {
        title: "Edit PDF",
        icon: FileText,
        href: "/dashboard/programs/edit-pdf",
      },
    ],
  },
]

const isPathMatch = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/")

// Only the deepest matching href in a group stays active, so a parent index route
// (e.g. /dashboard/investment) doesn't stay highlighted on its child pages.
const getActiveHref = (pathname: string, hrefs: string[]) =>
  hrefs
    .filter(href => isPathMatch(pathname, href))
    .sort((a, b) => b.length - a.length)[0]

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>("user")
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    const activeParent = menuItems.find(item =>
      item.subItems?.some(sub => isPathMatch(pathname, sub.href))
    )
    return activeParent ? [activeParent.title] : []
  })

  // Auto-expand group when navigating to a child page
  useEffect(() => {
    const activeParent = menuItems.find(item =>
      item.subItems?.some(sub => isPathMatch(pathname, sub.href))
    )
    if (activeParent) {
      setExpandedMenus(prev => prev.includes(activeParent.title) ? prev : [...prev, activeParent.title])
    }
  }, [pathname])

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  useEffect(() => {
    const getUserData = async () => {
      // Only fetch if we don't have a specific event-driven update or initial load
      // But here we just fetch on mount and update
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, email, avatar_url")
          .eq("id", user.id)
          .single()

        setUserRole(profile?.role || "user")
        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || "User",
          email: profile?.email || user.email || "",
          avatar_url: profile?.avatar_url
        })
      }
      setLoading(false)
    }

    getUserData()

    // Listen for profile updates from Settings page
    const handleProfileUpdate = () => {
      // Add a small delay to ensure DB propagation and effective re-fetch
      setTimeout(() => {
        getUserData()
        router.refresh()
      }, 500)
    }

    window.addEventListener('profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [])

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent triggering the settings link if nested
    await logout()
    router.push("/login")
    router.refresh()
  }

  const filteredMenuItems = menuItems.filter(item =>
    !item.allowedRoles || (userRole && item.allowedRoles.includes(userRole))
  )

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 mb-2">
        {!isCollapsed && (
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-play transition-transform group-hover:scale-105">
              <LayoutDashboard className="w-4 h-4 text-black" />
            </div>
            <span className="text-spotify-label text-white tracking-[0.2em]">AllBoard</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="h-8 w-8 p-0 hover:bg-surface-hover rounded-full transition-all text-muted-foreground hover:text-white">
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            <div className="h-8 bg-sidebar-accent/50 rounded animate-pulse" />
            <div className="h-8 bg-sidebar-accent/50 rounded animate-pulse" />
            <div className="h-8 bg-sidebar-accent/50 rounded animate-pulse" />
          </div>
        ) : (
          filteredMenuItems.map((item) => {
            // Check if this is a menu with sub-items
            if (item.subItems) {
              const activeSubHref = getActiveHref(pathname, item.subItems.map(sub => sub.href))
              const isSubActive = Boolean(activeSubHref)
              const isExpanded = expandedMenus.includes(item.title)

              return (
                <div key={item.title} className="space-y-1 px-2">
                  <Button
                    variant="ghost"
                    aria-label={item.title}
                    aria-expanded={isExpanded && !isCollapsed}
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "w-full justify-start gap-4 h-11 px-3 transition-all duration-200 group rounded-md",
                      isCollapsed && "justify-center px-0",
                      isSubActive
                        ? "text-white bg-surface-hover"
                        : "text-muted-foreground hover:text-white hover:bg-transparent",
                    )}
                  >
                    <item.icon className={cn(
                      "w-6 h-6 flex-shrink-0 transition-colors",
                      isSubActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                    )} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-bold tracking-tight flex-1 text-left">{item.title}</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                      </>
                    )}
                  </Button>

                  {/* Sub-menu items shown at the same visual level */}
                  {!isCollapsed && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1 pl-2">
                      {item.subItems.map((subItem) => {
                        const isActive = subItem.href === activeSubHref
                        return (
                          <Button
                            key={subItem.href}
                            asChild
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-4 h-11 px-3 transition-all duration-200 group rounded-md",
                              isActive
                                ? "text-white bg-surface-hover"
                                : "text-muted-foreground hover:text-white hover:bg-transparent",
                            )}
                          >
                            <Link href={subItem.href} aria-current={isActive ? "page" : undefined}>
                              <subItem.icon className={cn(
                                "w-6 h-6 flex-shrink-0 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                              )} />
                              <span className="text-sm font-bold tracking-tight">{subItem.title}</span>
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Regular menu item
            const isActive = item.href === "/dashboard"
              ? pathname === item.href
              : isPathMatch(pathname, item.href!)

            return (
              <div key={item.href} className="px-2">
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-11 px-3 transition-all duration-200 group rounded-md",
                    isCollapsed && "justify-center px-0",
                    isActive
                      ? "text-white bg-surface-hover"
                      : "text-muted-foreground hover:text-white hover:bg-transparent",
                  )}
                >
                  <Link href={item.href!} aria-label={item.title} aria-current={isActive ? "page" : undefined}>
                    <item.icon className={cn(
                      "w-6 h-6 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                    )} />
                    {!isCollapsed && (
                      <span className="text-sm font-bold tracking-tight">{item.title}</span>
                    )}
                  </Link>
                </Button>
              </div>
            )
          })
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className="mt-auto p-4 space-y-2 bg-gradient-to-t from-black/40 to-transparent">
        {/* User Profile (Links to Settings) */}
        <Button
          asChild
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-14 hover:bg-surface-hover group transition-all rounded-md px-3",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Link href="/dashboard/settings" aria-label="Account settings">
            <Avatar className="h-8 w-8 border-none ring-2 ring-white/5 group-hover:ring-white/20 transition-all">
              <AvatarImage src={userProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-surface-hover text-white text-xs font-bold">{userProfile?.full_name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-sm font-bold text-white truncate w-32 group-hover:text-primary transition-colors">
                  {userProfile?.full_name || "User"}
                </span>
                <span className="text-spotify-label text-muted-foreground truncate w-32">
                  {userProfile?.email}
                </span>
              </div>
            )}
          </Link>
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md px-3 transition-all",
            isCollapsed && "justify-center px-0",
          )}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold tracking-tight">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
