"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Home,
  GraduationCap,
  FolderOpen,
  Settings,
  User,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationsSection } from "@/components/sidebar/notifications-section"
import { MessagesSection } from "@/components/sidebar/messages-section"

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Classes", href: "/home/classes", icon: GraduationCap },
  { label: "Resources", href: "/home/resources", icon: FolderOpen },
]

type SidebarProps = {
  userId?: string
}

export function Sidebar({ userId }: SidebarProps = {}) {
  const pathname = usePathname()
  const currentPath = pathname || "/home"

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-sidebar">
      {/* Header - aligned with page header */}
      <div className="flex items-center justify-between border-b border-border px-4 h-[4rem]">
        <h2 className="text-sm font-semibold text-sidebar-foreground tracking-tight">
          UpClass
        </h2>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-sidebar-foreground/60" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href || (item.href !== "/home" && currentPath?.startsWith(item.href))
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                "hover:bg-primary/10 hover:text-primary",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 stroke-[2]",
                isActive && "text-primary"
              )} />
              <span className="tracking-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* Divider */}
        <div className="my-2 h-px bg-border/50" />

        {/* Notifications and Messages */}
        {userId && (
          <div className="space-y-0.5">
            <NotificationsSection userId={userId} />
            <MessagesSection userId={userId} />
          </div>
        )}

        {/* Divider */}
        <div className="my-2 h-px bg-border/50" />

        {/* Settings Section */}
        <Link
          href="/home/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
            "hover:bg-primary/10 hover:text-primary",
            currentPath === "/home/settings"
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-sidebar-foreground/70"
          )}
        >
          <Settings className={cn(
            "h-4 w-4 stroke-[2]",
            currentPath === "/home/settings" && "text-primary"
          )} />
          <span className="tracking-tight">Settings</span>
        </Link>
      </nav>

      {/* Profile at Bottom */}
      <div className="border-t border-border/50 px-2 py-3">
        <Link
          href={userId ? `/home/user/${userId}` : "/home/profile"}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
            "hover:bg-primary/10 hover:text-primary",
            currentPath?.startsWith("/home/user/")
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-sidebar-foreground/70"
          )}
        >
          <User className={cn(
            "h-4 w-4 stroke-[2]",
            currentPath?.startsWith("/home/user/") && "text-primary"
          )} />
          <span className="tracking-tight">Profile</span>
        </Link>
      </div>
    </aside>
  )
}
