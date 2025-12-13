"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type HomeShellProps = {
  children: React.ReactNode
  isAuthenticated: boolean
  userInfo?: {
    name: string | null
    email: string | null
    image: string | null
  } | null
  userId?: string
}

export function HomeShell({ children, isAuthenticated, userInfo, userId }: HomeShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          userId={userId}
          userInfo={userInfo}
          onNavigate={() => setIsSidebarOpen(false)}
          onClose={() => setIsSidebarOpen(false)}
          className="fixed inset-y-0 left-0 z-40 w-72 border-r bg-card/95 shadow-xl transition-transform duration-300 ease-in-out md:sticky md:top-0 md:w-64 md:shadow-none md:h-screen sidebar-mobile"
          data-state={isSidebarOpen ? "open" : "closed"}
        />

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <button
            className="fixed inset-0 z-[35] bg-black/40 backdrop-blur-sm md:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        )}

        {/* Main content */}
        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div className="sticky top-0 z-30 border-b bg-background">
            <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 md:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={isSidebarOpen}
                  aria-controls="app-sidebar"
                  type="button"
                  onClick={() => setIsSidebarOpen((open) => !open)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-1 items-center justify-end min-w-0">
                {isAuthenticated && userInfo ? (
                  <div className="w-full">
                    <PageHeader user={userInfo} userId={userId} />
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Welcome to UpClass</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/sign-in">Sign In</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/sign-in">Get Started</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-6 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}


