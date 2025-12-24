"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"

const navigation = [
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
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
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
