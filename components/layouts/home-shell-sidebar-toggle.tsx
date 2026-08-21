"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function HomeShellSidebarToggle() {
  const { openMobile, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hidden sm:inline-flex md:hidden"
      aria-label={openMobile ? "Close navigation" : "Open navigation"}
      aria-expanded={openMobile}
      aria-controls="app-sidebar"
      type="button"
      onClick={toggleSidebar}
    >
      <Menu />
    </Button>
  );
}
