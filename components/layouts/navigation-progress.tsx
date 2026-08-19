"use client"

import { usePathname } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left animate-[route-progress_450ms_ease-out_both] bg-primary"
    />
  )
}
