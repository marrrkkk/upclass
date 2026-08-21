"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  Folder,
  GraduationCap,
  Brain,
  LayoutDashboard,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { openAppCommandMenu } from "@/components/layouts/app-command-menu";
import { OrgSwitcher } from "@/components/org-switcher";
import { MessagesSection } from "@/components/sidebar/messages-section";
import { SidebarNavLink } from "@/components/sidebar/sidebar-nav-link";
import { Button } from "@/components/ui/button";
import { CourseSwatch } from "@/components/ui/course-identity";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOrganizationPath } from "@/hooks/use-organization-path";
import { cn } from "@/lib/utils";
import { type OrgRole } from "@/types/organization";

const RECENTS_STORAGE_KEY = "upclass:sidebar-recents-open";

const workspaceItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "Classes", path: "/classes", icon: GraduationCap },
  { label: "Learn", path: "/learn", icon: Brain },
] as const;

type SidebarProps = {
  recentClasses?: Array<{ id: string; title: string; color: string | null }>;
  userId?: string;
  userInfo?: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  className?: string;
  "data-state"?: "open" | "closed";
  onNavigate?: () => void;
  organizationRole?: OrgRole | null;
};

function routeIsActive(currentPath: string, href: string, exact = false) {
  return exact
    ? currentPath === href
    : currentPath === href || currentPath.startsWith(`${href}/`);
}

function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  return (
    <button
      type="button"
      onClick={() => openAppCommandMenu()}
      aria-label="Search and navigate"
      title={collapsed ? "Search" : undefined}
      className={cn(
        "focus-ring flex h-9 w-full items-center rounded-lg bg-muted/80 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        collapsed ? "justify-center px-0" : "gap-2 px-2.5",
      )}
    >
      <Search className="size-3.5 shrink-0 stroke-[1.5]" aria-hidden="true" />
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 text-left">Search</span>
          <kbd className="rounded px-1 font-normal text-[10px] text-muted-foreground/80">
            ⌘K
          </kbd>
        </>
      )}
    </button>
  );
}

export function Sidebar({
  recentClasses,
  userId,
  userInfo,
  className,
  onNavigate,
  organizationRole,
}: SidebarProps = {}) {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const handleNavigate = () => {
    setOpenMobile(false);
    onNavigate?.();
  };
  const pathname = usePathname();
  const router = useRouter();
  const organizationPath = useOrganizationPath();
  const currentPath = pathname || "/";
  const [recentsOpen, setRecentsOpen] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(RECENTS_STORAGE_KEY) === "0") {
      setRecentsOpen(false);
    }
  }, []);

  const toggleRecents = () => {
    setRecentsOpen((current) => {
      const next = !current;
      window.localStorage.setItem(RECENTS_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const dashboardHref = organizationPath("/dashboard");
  const classesHref = organizationPath("/classes");
  const resourcesHref = organizationPath("/resources");
  const settingsHref = organizationPath("/settings");
  const adminHref = organizationPath("/admin");
  const profileHref = userId
    ? organizationPath(`/user/${userId}`)
    : organizationPath("/profile");
  const profileIsActive = routeIsActive(currentPath, profileHref);
  const visibleRecentClasses = recentClasses?.slice(0, 5) ?? [];
  const hasMoreClasses =
    (recentClasses?.length ?? 0) > visibleRecentClasses.length;
  const showRecentsList = collapsed || recentsOpen;

  const activeRecentClassId = visibleRecentClasses.find((item) =>
    routeIsActive(currentPath, organizationPath(`/classes/${item.id}`)),
  )?.id;

  return (
    <SidebarPrimitive
      id="app-sidebar"
      aria-label="Application navigation"
      collapsible="icon"
      className={className}
    >
      <SidebarHeader
        className={cn(
          "h-[var(--app-header-height)] shrink-0 justify-center px-3 py-0",
          collapsed && "px-2",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center",
          )}
        >
          <Link
            href={dashboardHref}
            onClick={handleNavigate}
            onMouseEnter={() => router.prefetch(dashboardHref)}
            title={collapsed ? "UpClass — dashboard" : undefined}
            aria-label={collapsed ? "UpClass — dashboard" : undefined}
            className="focus-ring group flex min-w-0 items-center gap-2 rounded-md px-0.5 py-1"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ArrowUpRight
                className="size-3.5 stroke-[2]"
                aria-hidden="true"
              />
            </span>
            {collapsed ? null : (
              <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-foreground">
                UpClass
              </span>
            )}
          </Link>
          {collapsed ? null : (
            <>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                aria-expanded={!collapsed}
                aria-controls="app-sidebar"
                className="focus-ring ml-auto hidden size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
              >
                <ChevronLeft className="size-4 stroke-[1.5]" aria-hidden="true" />
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                onClick={() => setOpenMobile(false)}
                aria-label="Close navigation"
                type="button"
              >
                <PanelLeftClose className="size-4 stroke-[1.5]" />
              </Button>
            </>
          )}
        </div>
      </SidebarHeader>

      <div className={cn("shrink-0 px-2.5 pb-2", collapsed && "px-2")}>
        <SidebarSearch collapsed={collapsed} />
      </div>

      {userId ? (
        <div className={cn("shrink-0 px-2.5 pb-2", collapsed && "px-2")}>
          <OrgSwitcher collapsed={collapsed} />
        </div>
      ) : null}

      <SidebarContent
        className={cn(
          "sidebar-hide-scroll flex-1 overflow-y-auto pb-4 pt-1",
          collapsed ? "px-2" : "px-2.5",
        )}
      >
        <SidebarGroup aria-label="Workspace" className="p-0">
          {collapsed ? null : (
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu className="gap-0.5">
                {workspaceItems.map((item) => {
                  const href = organizationPath(item.path);
                  const isActive =
                    item.path === "/classes"
                      ? routeIsActive(currentPath, href) && !activeRecentClassId
                      : routeIsActive(
                          currentPath,
                          href,
                          "exact" in item && item.exact,
                        );
                  return (
                    <SidebarNavLink
                      key={item.path}
                      href={href}
                      active={isActive}
                      icon={<item.icon />}
                      label={item.label}
                      collapsed={collapsed}
                      onClick={handleNavigate}
                    />
                  );
                })}
                {userId ? (
                  <MessagesSection
                    userId={userId}
                    onNavigate={handleNavigate}
                    collapsed={collapsed}
                  />
                ) : null}
                <SidebarNavLink
                  href={resourcesHref}
                  active={routeIsActive(currentPath, resourcesHref)}
                  icon={<Folder />}
                  label="Resources"
                  collapsed={collapsed}
                  onClick={handleNavigate}
                />
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleRecentClasses.length > 0 ? (
          <SidebarGroup
            aria-labelledby="sidebar-courses-label"
            className={cn("p-0", collapsed ? "mt-2" : "mt-3")}
          >
            {collapsed ? null : (
              <div className="flex items-center gap-1 pr-1">
                <h2 id="sidebar-courses-label" className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-expanded={recentsOpen}
                    aria-controls="sidebar-recents"
                    onClick={toggleRecents}
                    className="focus-ring flex h-7 w-full items-center gap-1 rounded-md px-2 text-left text-[11px] font-medium text-muted-foreground/80 hover:text-foreground"
                  >
                    <span className="truncate">Recent classes</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-3.5 shrink-0 stroke-[1.5] transition-transform",
                        !recentsOpen && "-rotate-90",
                      )}
                    />
                  </button>
                </h2>
                {hasMoreClasses ? (
                  <Link
                    href={classesHref}
                    onClick={handleNavigate}
                    onMouseEnter={() => router.prefetch(classesHref)}
                    aria-label="View all classes"
                    title="View all classes"
                    className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                  >
                    <ArrowUpRight className="size-3.5 stroke-[1.5]" />
                  </Link>
                ) : null}
              </div>
            )}
            {showRecentsList ? (
              <SidebarGroupContent>
                <nav id="sidebar-recents" aria-label="Recent classes">
                  <SidebarMenu className="gap-0.5">
                    {visibleRecentClasses.map((item) => {
                      const href = organizationPath(`/classes/${item.id}`);
                      const active = routeIsActive(currentPath, href);
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.title}
                          >
                            <Link
                              href={href}
                              aria-current={active ? "page" : undefined}
                              data-active={active ? "true" : "false"}
                              onClick={handleNavigate}
                              onMouseEnter={() => router.prefetch(href)}
                              title={collapsed ? item.title : undefined}
                              aria-label={collapsed ? item.title : undefined}
                            >
                              <CourseSwatch
                                value={item.color}
                                courseKey={item.id}
                                size="sm"
                                className="size-2.5 shrink-0 rounded-full"
                              />
                              {collapsed ? null : (
                                <span
                                  className={cn(
                                    "min-w-0 flex-1 truncate text-[13px]",
                                    active
                                      ? "font-semibold text-foreground"
                                      : "font-medium text-foreground/80",
                                  )}
                                >
                                  {item.title}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </nav>
              </SidebarGroupContent>
            ) : null}
          </SidebarGroup>
        ) : null}

        <SidebarGroup
          aria-label="Manage"
          className={cn("p-0", collapsed ? "mt-2" : "mt-3")}
        >
          {collapsed ? null : (
            <SidebarGroupLabel>Account</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <nav aria-label="Account and organization">
              <SidebarMenu className="gap-0.5">
                {organizationRole === "owner" ||
                organizationRole === "admin" ? (
                  <SidebarNavLink
                    href={adminHref}
                    active={routeIsActive(currentPath, adminHref)}
                    icon={<ShieldCheck />}
                    label="Administration"
                    collapsed={collapsed}
                    onClick={handleNavigate}
                  />
                ) : null}
                <SidebarNavLink
                  href={settingsHref}
                  active={routeIsActive(currentPath, settingsHref)}
                  icon={<Settings />}
                  label="Settings"
                  collapsed={collapsed}
                  onClick={handleNavigate}
                />
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {userInfo ? (
        <SidebarFooter
          className={cn("shrink-0 border-t border-hairline/70 p-2.5", collapsed && "p-2")}
        >
          <Link
            href={profileHref}
            aria-current={profileIsActive ? "page" : undefined}
            onClick={handleNavigate}
            onMouseEnter={() => router.prefetch(profileHref)}
            title={collapsed ? userInfo.name || "My profile" : undefined}
            aria-label={collapsed ? userInfo.name || "My profile" : undefined}
            className={cn(
              "focus-ring group flex min-h-11 items-center rounded-lg transition-colors",
              collapsed ? "justify-center p-1" : "gap-2.5 px-1.5 py-1",
              profileIsActive ? "bg-muted" : "hover:bg-muted",
            )}
          >
            <EntityAvatar
              name={userInfo.name || userInfo.email || "User"}
              image={userInfo.image}
              colorKey={userId}
              size="sm"
              shape="round"
              className="size-8"
            />
            {collapsed ? null : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {userInfo.name || "My profile"}
                  </p>
                  <p className="truncate text-[11px] font-normal text-muted-foreground">
                    {userInfo.email}
                  </p>
                </div>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="size-3.5 shrink-0 stroke-[1.5] text-muted-foreground/70"
                />
              </>
            )}
          </Link>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </SidebarPrimitive>
  );
}
