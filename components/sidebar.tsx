"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  FileText,
  GitCompare,
  Fuel,
  Truck,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"

interface NavigationItem {
  name: string
  href?: string
  icon: any
  children?: {
    name: string
    href: string
    icon: any
  }[]
}

const navigation: NavigationItem[] = [
  {
    name: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Báo cáo",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Đối soát",
    href: "/reconciliation",
    icon: GitCompare,
  },
  {
    name: "Nhiên liệu",
    href: "/fuel",
    icon: Fuel,
  },
  {
    name: "Phương tiện",
    href: "/vehicles",
    icon: Truck,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggle } = useSidebar()

  // Initialize expanded items with active parent
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const initialExpanded: string[] = []
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname === child.href)
        if (hasActiveChild) {
          initialExpanded.push(item.name)
        }
      }
    })
    return initialExpanded
  })

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-white transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo & Toggle Button */}
        <div className="flex h-16 items-center justify-between border-b border-border px-3">
          <h1
            className={cn(
              "text-xl font-bold text-foreground transition-opacity duration-300",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            NAK LOGISTICS
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-8 w-8 shrink-0"
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            // Check if item or any child is active
            const isActive = item.href ? pathname === item.href : false
            const hasActiveChild = item.children?.some(child => pathname === child.href) || false
            const isExpanded = expandedItems.includes(item.name)

            // Item without children (regular link)
            if (!item.children) {
              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0")} />
                  <span
                    className={cn(
                      "whitespace-nowrap transition-all duration-300",
                      isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            }

            // Item with children (expandable)
            return (
              <div key={item.name}>
                {/* Parent Item */}
                <button
                  onClick={() => !isCollapsed && toggleExpand(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    hasActiveChild
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0")} />
                  <span
                    className={cn(
                      "flex-1 text-left whitespace-nowrap transition-all duration-300",
                      isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}
                  >
                    {item.name}
                  </span>
                  {!isCollapsed && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {/* Children (Submenu) */}
                {!isCollapsed && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            isChildActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span className="whitespace-nowrap">{child.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User Profile & Settings */}
        <div className="border-t border-border p-2">
          {!isCollapsed && (
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  Admin User
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  admin@nak.com
                </p>
              </div>
            </div>
          )}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Cài đặt" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}
            >
              Cài đặt
            </span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
