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
    <aside className="flex w-64 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-5">
        <h2 className="text-base font-semibold text-sidebar-foreground">
          Learning Content
        </h2>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sidebar-accent transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70"
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.5]" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Notifications and Messages */}
        {userId && (
          <div className="mt-2 space-y-0.5">
            <NotificationsSection userId={userId} />
            <MessagesSection userId={userId} />
          </div>
        )}

        {/* Settings Section */}
        <div className="mt-2">
          <Link
            href="/home/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              currentPath === "/home/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70"
            )}
          >
            <Settings className="h-5 w-5 stroke-[1.5]" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Profile at Bottom */}
      <div className="border-t px-3 py-4 space-y-0.5">
        <Link
          href={userId ? `/home/user/${userId}` : "/home/profile"}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentPath?.startsWith("/home/user/")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70"
          )}
        >
          <User className="h-5 w-5 stroke-[1.5]" />
          <span>Profile</span>
        </Link>

      </div>
    </aside>
  )
}

