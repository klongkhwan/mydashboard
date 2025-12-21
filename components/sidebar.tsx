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
    title: "My Trade",
    icon: TrendingUp,
    href: "/dashboard/my-trade",
    allowedRoles: ["user", "admin"],
  },
  {
    title: "Crypto",
    icon: Bitcoin,
    href: "/dashboard/crypto",
    allowedRoles: ["user", "admin"],
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

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

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
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Dashboard</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0 hover:bg-sidebar-accent">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
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
              const isSubActive = item.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href))
              const isExpanded = expandedMenus.includes(item.title)

              return (
                <div key={item.title}>
                  <Button
                    variant={isSubActive ? "default" : "ghost"}
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "w-full justify-start gap-3 h-9",
                      isCollapsed && "justify-center px-2",
                      isSubActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">{item.title}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                      </>
                    )}
                  </Button>

                  {/* Sub-menu items */}
                  {!isCollapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border/50 pl-2">
                      {item.subItems.map((subItem) => {
                        const isActive = pathname === subItem.href || pathname.startsWith(subItem.href)
                        return (
                          <Link key={subItem.href} href={subItem.href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-3 h-9",
                                isActive
                                  ? "bg-sidebar-primary/70 text-sidebar-primary-foreground hover:bg-sidebar-primary/80"
                                  : "text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                              )}
                            >
                              <subItem.icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-sm">{subItem.title}</span>
                            </Button>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Regular menu item
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!))

            return (
              <div key={item.href}>
                <Link href={item.href!}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      isCollapsed && "justify-center px-2",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </Button>
                </Link>
              </div>
            )
          })
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-2 border-t border-sidebar-border space-y-1">

        {/* User Profile (Links to Settings) */}
        <Link href="/dashboard/settings" className="block">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-14 hover:bg-sidebar-accent group relative",
              isCollapsed && "justify-center h-14 px-0"
            )}
          >
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={userProfile?.avatar_url || ""} />
              <AvatarFallback>{userProfile?.full_name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-sm font-medium text-sidebar-foreground truncate w-32">
                  {userProfile?.full_name}
                </span>
                <span className="text-xs text-muted-foreground truncate w-32">
                  {userProfile?.email}
                </span>
              </div>
            )}

            {!isCollapsed && <Settings className="ml-auto w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </Button>
        </Link>

        {/* Logout */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center px-2",
          )}
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </Button>

      </div>
    </div>
  )
}
