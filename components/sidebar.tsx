"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Home,
  GraduationCap,
  FolderOpen,
  Settings,
  User,
  BookOpen,
  PanelLeftClose,
  ArrowUpRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationsSection } from "@/components/sidebar/notifications-section"
import { MessagesSection } from "@/components/sidebar/messages-section"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Classes", href: "/classes", icon: GraduationCap },
  { label: "Resources", href: "/resources", icon: FolderOpen },
]

type SidebarProps = {
  userId?: string
  userInfo?: {
    name: string | null
    email: string | null
    image: string | null
  } | null
  className?: string
  "data-state"?: "open" | "closed"
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ userId, userInfo, className, "data-state": dataState, onNavigate, onClose }: SidebarProps = {}) {
  const pathname = usePathname()
  const currentPath = pathname || "/home"

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "flex flex-col border-r bg-card/50 backdrop-blur-xl group z-30 transform-gpu will-change-transform",
        className
      )}
      data-state={dataState}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-[4rem] border-b border-border/40">
        <Link
          href="/home"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          onClick={onNavigate}
        >
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <ArrowUpRight className="h-6 w-6" strokeWidth={3} />
          </div>
          <span className="font-bold text-lg tracking-tight">UpClass</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
          type="button"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {/* Discover Section */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Discover
          </h3>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.href || (item.href !== "/home" && currentPath?.startsWith(item.href))
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group/item",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={onNavigate}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform group-hover/item:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Connect Section */}
        {userId && (
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Connect
            </h3>
            <div className="space-y-0.5">
              <NotificationsSection userId={userId} />
              <MessagesSection userId={userId} />
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            System
          </h3>
          <nav className="space-y-0.5">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group/item",
                currentPath === "/settings"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={onNavigate}
            >
              <Settings className={cn(
                "h-4 w-4 transition-transform group-hover/item:rotate-90 duration-500",
                currentPath === "/settings" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-3 border-t border-border/40">
        <Link
          href={userId ? `/user/${userId}` : "/profile"}
          className={cn(
            "flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 border border-transparent",
            currentPath?.startsWith("/user/")
              ? "bg-muted border-border shadow-sm"
              : "hover:bg-muted/50 hover:border-border/50"
          )}
          onClick={onNavigate}
        >
          {userInfo ? (
            <Avatar className="h-9 w-9 border border-border/50">
              <AvatarImage src={userInfo.image || undefined} alt={userInfo.name || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-semibold">
                {userInfo.name
                  ? userInfo.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                  : "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{userInfo?.name || "My Profile"}</p>
            <p className="text-xs text-muted-foreground truncate">View account</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
