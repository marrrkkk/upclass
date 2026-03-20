"use client"

import { Menu } from "lucide-react"

import { useHomeShellSidebarState } from "@/components/layouts/home-shell-sidebar-state"
import { Button } from "@/components/ui/button"

export function HomeShellSidebarToggle() {
  const isOpen = useHomeShellSidebarState((state) => state.isOpen)
  const toggle = useHomeShellSidebarState((state) => state.toggle)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      aria-label={isOpen ? "Close navigation" : "Open navigation"}
      aria-expanded={isOpen}
      aria-controls="app-sidebar"
      type="button"
      onClick={toggle}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

