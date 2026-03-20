import Link from "next/link"

import { BackgroundRefreshClient } from "@/components/layouts/background-refresh-client"
import { HomeShellSidebarDrawer } from "@/components/layouts/home-shell-sidebar-drawer"
import { HomeShellSidebarToggle } from "@/components/layouts/home-shell-sidebar-toggle"
import { NavigationProgress } from "@/components/navigation-progress"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

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
  return (
    <div className="min-h-screen bg-background">
      <NavigationProgress />
      <BackgroundRefreshClient />

      <div className="flex">
        <HomeShellSidebarDrawer userId={userId} userInfo={userInfo} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 border-b bg-background">
            <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <HomeShellSidebarToggle />
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-end">
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

          <div className="flex-1 px-4 py-6 sm:px-6 md:px-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
