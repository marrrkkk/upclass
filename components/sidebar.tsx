"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Folder,
  GraduationCap,
  LayoutDashboard,
  PanelLeftClose,
  Settings,
  ShieldCheck,
} from "lucide-react";

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
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOrganizationPath } from "@/hooks/use-organization-path";
import { cn } from "@/lib/utils";
import { ORG_ROLE_LABELS, type OrgRole } from "@/types/organization";

const workspaceItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "Classes", path: "/classes", icon: GraduationCap },
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

export function Sidebar({
  recentClasses,
  userId,
  userInfo,
  className,
  onNavigate,
  organizationRole,
}: SidebarProps = {}) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const handleNavigate = () => {
    setOpenMobile(false);
    onNavigate?.();
  };
  const pathname = usePathname();
  const router = useRouter();
  const organizationPath = useOrganizationPath();
  const currentPath = pathname || "/";
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current)
        window.clearTimeout(scrollTimeoutRef.current);
    },
    [],
  );

  const handleSidebarScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(
      () => setIsScrolling(false),
      500,
    );
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

  // A class page is highlighted by its recent-class row when it is listed;
  // "Classes" then stays quiet so only one item reads as selected. When the
  // class is not in the recents (deep link, longer list), the section takes
  // over via its prefix match.
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
      {/* Brand + mobile close */}
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
            className="focus-ring group flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
          >
            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs ring-1 ring-black/5 dark:ring-white/10">
              <ArrowUpRight
                className="size-3.5 stroke-[2.5]"
                aria-hidden="true"
              />
            </span>
            {collapsed ? null : (
              <span className="min-w-0 truncate font-display text-[15px] font-bold tracking-tight text-foreground">
                UpClass
              </span>
            )}
          </Link>
          {collapsed ? null : (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-8 rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground md:hidden"
              onClick={() => setOpenMobile(false)}
              aria-label="Close navigation"
              type="button"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      {/* Workspace switcher */}
      {userId ? (
        <div className={cn("shrink-0 px-2.5 pb-2 pt-0.5", collapsed && "px-2")}>
          <OrgSwitcher collapsed={collapsed} />
        </div>
      ) : null}

      <SidebarContent
        className={cn(
          "minimal-scrollbar flex-1 overflow-y-auto pb-4 pt-1",
          collapsed ? "px-2" : "px-2.5",
        )}
        data-scrolling={isScrolling ? "true" : "false"}
        onScroll={handleSidebarScroll}
      >
        <SidebarGroup aria-label="Workspace" className="p-0">
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu className={collapsed ? "gap-1" : "gap-0.5"}>
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
            className={cn("p-0", collapsed ? "mt-2" : "mt-4")}
          >
            <SidebarSeparator
              className={cn("mb-2.5 opacity-60", collapsed && "mx-auto w-6")}
            />
            <SidebarGroupLabel asChild>
              <h2 id="sidebar-courses-label">Recent classes</h2>
            </SidebarGroupLabel>
            {hasMoreClasses ? (
              <SidebarGroupAction asChild>
                <Link
                  href={classesHref}
                  onClick={handleNavigate}
                  onMouseEnter={() => router.prefetch(classesHref)}
                  aria-label="View all classes"
                  title="View all classes"
                >
                  <ArrowUpRight />
                </Link>
              </SidebarGroupAction>
            ) : null}
            <SidebarGroupContent>
              <nav aria-label="Recent classes">
                <SidebarMenu className={collapsed ? "gap-1" : "gap-0.5"}>
                  {visibleRecentClasses.map((item) => {
                    const href = organizationPath(`/classes/${item.id}`);
                    const active = routeIsActive(currentPath, href);
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={cn(
                            "group/course-item",
                            active && "font-semibold shadow-2xs",
                          )}
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
                              className="size-2.5 shrink-0 rounded-full ring-2 ring-background/80"
                            />
                            {collapsed ? null : (
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate text-[13px]",
                                  active
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground/80 group-hover/course-item:text-foreground",
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
          </SidebarGroup>
        ) : null}

        <SidebarGroup
          aria-label="Manage"
          className={cn("p-0", collapsed ? "mt-2" : "mt-3")}
        >
          <SidebarSeparator
            className={cn("mb-2.5 opacity-60", collapsed && "mx-auto w-6")}
          />
          <SidebarGroupContent>
            <nav aria-label="Account and organization">
              <SidebarMenu className={collapsed ? "gap-1" : "gap-0.5"}>
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

      {/* User profile footer card */}
      {userInfo ? (
        <SidebarFooter
          className={cn("shrink-0 p-2.5 pt-1.5", collapsed && "p-2")}
        >
          <Link
            href={profileHref}
            aria-current={profileIsActive ? "page" : undefined}
            onClick={handleNavigate}
            onMouseEnter={() => router.prefetch(profileHref)}
            title={collapsed ? userInfo.name || "My profile" : undefined}
            aria-label={collapsed ? userInfo.name || "My profile" : undefined}
            className={cn(
              "focus-ring group flex min-h-11 items-center rounded-xl transition-all duration-150 ease-out-expo border border-hairline/60 shadow-2xs",
              collapsed ? "justify-center p-1.5" : "gap-2.5 p-2",
              profileIsActive
                ? "bg-primary/10 border-primary/25 text-foreground dark:bg-primary/15"
                : "bg-surface/40 hover:bg-surface hover:border-hairline",
            )}
          >
            <EntityAvatar
              name={userInfo.name || userInfo.email || "User"}
              image={userInfo.image}
              colorKey={userId}
              size="sm"
              className="size-7.5 rounded-lg ring-1 ring-border/40"
            />
            {collapsed ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground tracking-tight">
                  {userInfo.name || "My profile"}
                </p>
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                  {organizationRole
                    ? ORG_ROLE_LABELS[organizationRole]
                    : userInfo.email}
                </p>
              </div>
            )}
          </Link>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </SidebarPrimitive>
  );
}
