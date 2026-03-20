"use client"

import dynamic from "next/dynamic"

import { useHomeShellSidebarState } from "@/components/layouts/home-shell-sidebar-state"

const Sidebar = dynamic(() => import("@/components/sidebar").then((mod) => mod.Sidebar))

type HomeShellSidebarDrawerProps = {
  userId?: string
  userInfo?: {
    name: string | null
    email: string | null
    image: string | null
  } | null
}

export function HomeShellSidebarDrawer({ userId, userInfo }: HomeShellSidebarDrawerProps) {
  const isOpen = useHomeShellSidebarState((state) => state.isOpen)
  const setOpen = useHomeShellSidebarState((state) => state.setOpen)

  return (
    <>
      <Sidebar
        userId={userId}
        userInfo={userInfo}
        onNavigate={() => setOpen(false)}
        onClose={() => setOpen(false)}
        className="fixed inset-y-0 left-0 z-40 w-72 border-r bg-card/95 shadow-xl transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:w-64 md:shadow-none sidebar-mobile"
        data-state={isOpen ? "open" : "closed"}
      />

      {isOpen ? (
        <button
          className="fixed inset-0 z-[35] bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}
    </>
  )
}
