"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  Home, 
  GraduationCap, 
  FolderOpen, 
  Star, 
  Settings,
  ChevronLeft,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Classes", href: "/home/classes", icon: GraduationCap },
  { label: "Resources", href: "/home/resources", icon: FolderOpen },
]

const favoriteItems = [
  { label: "Figma Basic", href: "/home/favorites/figma-basic" },
  { label: "Folder NEW 2024", href: "/home/favorites/folder-new-2024" },
  { label: "Assignment 101", href: "/home/favorites/assignment-101" },
]

export function Sidebar() {
  const pathname = usePathname()
  const currentPath = pathname || "/home"
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(
    currentPath.startsWith("/home/favorites")
  )

  useEffect(() => {
    if (currentPath.startsWith("/home/favorites")) {
      setIsFavoritesOpen(true)
    }
  }, [currentPath])

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

        {/* Favorites Section */}
        <div className="mt-2">
          <button
            onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              currentPath.startsWith("/home/favorites")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70"
            )}
          >
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 stroke-[1.5]" />
              <span>Favorites</span>
              <span className="ml-1 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-xs font-medium text-sidebar-accent-foreground">
                {favoriteItems.length}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isFavoritesOpen && "rotate-180"
              )}
            />
          </button>
          
          {isFavoritesOpen && (
            <div className="ml-8 mt-1 space-y-0.5">
              {favoriteItems.map((item) => {
                const isActive = currentPath === item.href
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70"
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Settings at Bottom */}
      <div className="border-t px-3 py-4">
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
    </aside>
  )
}

