"use client"

import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/top-bar"
import { useSidebar } from "@/components/sidebar-context"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <TopBar breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
