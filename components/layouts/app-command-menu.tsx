"use client"

import Link from "next/link"
import * as React from "react"
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Command,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Search,
  Settings,
  Send,
} from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { cn } from "@/lib/utils"

const destinations = [
  { label: "Dashboard", detail: "What matters now", path: "/dashboard", icon: LayoutDashboard },
  { label: "Classes", detail: "Your course spaces", path: "/classes", icon: GraduationCap },
  { label: "Messages", detail: "Conversations and class channels", path: "/messages", icon: MessageSquare },
  { label: "Resources", detail: "Files and learning materials", path: "/resources", icon: FolderOpen },
  { label: "Calendar", detail: "Deadlines and class schedule", path: "/calendar", icon: CalendarDays },
  { label: "Notifications", detail: "Announcements and class updates", path: "/notifications", icon: Bell },
  { label: "Settings", detail: "Account and workspace settings", path: "/settings", icon: Settings },
] as const

const quickActions = [
  { label: "Create assignment", detail: "Add coursework to a class", path: "/classes", icon: PenLine, hint: "c a" },
  { label: "Compose message", detail: "Start a conversation", path: "/messages", icon: Send, hint: "c m" },
] as const

const shortcutHints = [
  { keys: "g d", label: "Dashboard" },
  { keys: "g c", label: "Classes" },
  { keys: "g m", label: "Messages" },
  { keys: "g r", label: "Resources" },
  { keys: "c a", label: "Create assignment" },
  { keys: "c m", label: "Compose message" },
  { keys: "/", label: "Focus search" },
] as const

export function AppCommandMenu() {
  const organizationPath = useOrganizationPath()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const focus = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(focus)
  }, [open])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleDestinations = destinations.filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(normalizedQuery),
  )
  const visibleQuickActions = quickActions.filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(normalizedQuery),
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search and navigate"
        className="focus-ring hidden h-9 items-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-card px-2.5 type-caption text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground sm:inline-flex"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span>Search</span>
        <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 type-mono text-[0.625rem]">⌘K</kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery("")
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Search UpClass</DialogTitle>
            <DialogDescription>Find a destination or run a quick action in your workspace.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <Command className="size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations and actions…"
              aria-label="Search destinations and actions"
              className="h-8 border-0 bg-transparent px-0 shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0"
            />
            <kbd className="rounded border border-hairline px-1.5 py-0.5 type-mono text-[0.625rem] text-muted-foreground">ESC</kbd>
          </div>
          <div className="p-2">
            {visibleDestinations.length ? (
              <>
                <p className="px-2 py-1.5 type-overline text-muted-foreground">Go to</p>
                <div role="listbox" aria-label="Search results" className="space-y-0.5">
                  {visibleDestinations.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        role="option"
                        href={organizationPath(item.path)}
                        onClick={() => setOpen(false)}
                        className={cn("focus-ring flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-2.5 text-foreground transition-colors hover:bg-surface-sunken")}
                      >
                        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block type-small font-medium">{item.label}</span>
                          <span className="block type-caption text-muted-foreground">{item.detail}</span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    )
                  })}
                </div>
              </>
            ) : null}

            {visibleQuickActions.length ? (
              <>
                <p className="px-2 py-1.5 type-overline text-muted-foreground">Quick actions</p>
                <div role="listbox" aria-label="Quick actions" className="space-y-0.5">
                  {visibleQuickActions.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.label}
                        role="option"
                        href={organizationPath(item.path)}
                        onClick={() => setOpen(false)}
                        className={cn("focus-ring flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-2.5 text-foreground transition-colors hover:bg-surface-sunken")}
                      >
                        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block type-small font-medium">{item.label}</span>
                          <span className="block type-caption text-muted-foreground">{item.detail}</span>
                        </span>
                        <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 type-mono text-[0.625rem] text-muted-foreground">
                          {item.hint}
                        </kbd>
                      </Link>
                    )
                  })}
                </div>
              </>
            ) : null}

            {visibleDestinations.length === 0 && visibleQuickActions.length === 0 ? (
              <p className="px-2 py-8 text-center type-small text-muted-foreground">No destinations match “{query}”.</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline px-2 py-2.5">
              {shortcutHints.map((hint) => (
                <span key={hint.keys} className="flex items-center gap-1.5 type-caption text-muted-foreground">
                  <kbd className="rounded border border-hairline bg-surface px-1 py-0.5 type-mono text-[0.625rem]">{hint.keys}</kbd>
                  {hint.label}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}