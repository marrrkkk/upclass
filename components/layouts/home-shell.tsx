"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  GraduationCap,
  Users,
  FolderOpen,
  Settings,
  MessageSquare,
  Bell,
  Building2,
  Plus,
} from "lucide-react"

import { useOrgStore } from "@/stores/org-store"
import { OrgSwitcherWrapper } from "@/components/layouts/org-switcher-wrapper"
import { BackgroundRefreshClient } from "@/components/layouts/background-refresh-client"
import { RouteContentTransition } from "@/components/layouts/route-content-transition"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar"

type HomeShellProps = {
  children: React.ReactNode
  isAuthenticated: boolean
  userInfo?: {
    name: string | null
    email: string | null
    image: string | null
  } | null
  userId?: string
  userOrgs?: Array<{
    id: string
    name: string
    slug: string
    role: "admin" | "teacher" | "student"
    logo?: string | null
  }>
}

export function HomeShell({ children, isAuthenticated, userInfo, userId, userOrgs }: HomeShellProps) {
  const pathname = usePathname()
  const currentPath = pathname || "/"
  const { activeOrgSlug } = useOrgStore()

  const orgNavItems = activeOrgSlug
    ? [
        { label: "Dashboard", href: `/${activeOrgSlug}`, icon: Home },
        { label: "Classes", href: `/${activeOrgSlug}/classes`, icon: GraduationCap },
        { label: "Members", href: `/${activeOrgSlug}/members`, icon: Users },
        { label: "Messages", href: `/${activeOrgSlug}/messages`, icon: MessageSquare },
        { label: "Library", href: `/${activeOrgSlug}/library`, icon: FolderOpen },
        { label: "Notifications", href: `/${activeOrgSlug}/notifications`, icon: Bell },
        { label: "Settings", href: `/${activeOrgSlug}/settings`, icon: Settings },
      ]
    : []

  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}
    >
      <BackgroundRefreshClient />

      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <Logo href="/" size="md" />
          </div>
          {isAuthenticated && userOrgs && (
            <OrgSwitcherWrapper orgs={userOrgs} />
          )}
        </SidebarHeader>

        <SidebarContent>
          {activeOrgSlug ? (
            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarMenu>
                {orgNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    currentPath === item.href ||
                    (item.href !== `/${activeOrgSlug}` && currentPath?.startsWith(item.href))

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ) : (
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className="flex flex-col gap-3 px-2 py-4 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>No active organization</span>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/org/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                      </Link>
                    </Button>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          {isAuthenticated && userInfo && userId ? (
            <Link
              href={`/user/${userId}`}
              className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-sidebar-accent"
            >
              <Avatar className="size-8 border border-sidebar-border">
                <AvatarImage src={userInfo.image || undefined} alt={userInfo.name || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
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
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="font-medium text-sidebar-foreground truncate text-sm">{userInfo.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
              </div>
            </Link>
          ) : null}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-[12px]">
          <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 md:px-8">
            <SidebarTrigger className="-ml-1" />

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
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 md:px-8">
          <RouteContentTransition>{children}</RouteContentTransition>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
