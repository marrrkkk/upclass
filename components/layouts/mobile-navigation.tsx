"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  organizationPath,
  organizationSlugFromPathname,
} from "@/lib/organization-path";
import { cn } from "@/lib/utils";

const destinations = [
  { label: "Home", path: "/dashboard", icon: LayoutDashboard },
  { label: "Classes", path: "/classes", icon: GraduationCap },
  { label: "Messages", path: "/messages", icon: MessageSquare },
] as const;

function routeIsActive(pathname: string, href: string, isDashboard: boolean) {
  return isDashboard
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({
  isAuthenticated,
  pathname: pathnameOverride,
}: {
  isAuthenticated: boolean;
  pathname?: string;
}) {
  const routePathname = usePathname();
  const pathname = pathnameOverride ?? routePathname ?? "/";
  const activePath = pathname;
  const orgSlug = organizationSlugFromPathname(pathname);
  const { openMobile, setOpenMobile } = useSidebar();

  if (!isAuthenticated) return null;

  const items = destinations.map((item) => ({
    ...item,
    href: organizationPath(orgSlug, item.path),
  }));
  const moreIsActive = !items.some((item) =>
    routeIsActive(activePath, item.href, item.path === "/dashboard"),
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = routeIsActive(
            activePath,
            item.href,
            item.path === "/dashboard",
          );

          return (
            <Link
              key={item.path}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring mx-0.5 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] type-caption font-medium transition-colors",
                active
                  ? "bg-primary-surface text-primary-text"
                  : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="More"
          aria-controls="app-sidebar"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile(true)}
          className={cn(
            "focus-ring mx-0.5 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] type-caption font-medium transition-colors",
            moreIsActive || openMobile
              ? "bg-primary-surface text-primary-text"
              : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
