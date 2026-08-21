"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type SidebarNavLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  active?: boolean;
  icon: ReactNode;
  label: string;
  description?: string;
  trailing?: ReactNode;
  /** Rail mode: centered icon with the label as accessible name/tooltip. */
  collapsed?: boolean;
};

/**
 * Primary sidebar destination row.
 *
 * Active state uses a quiet fill. Labels stay regular weight.
 *
 * Prefetching is left to `next/link` (enabled by default), so the route is
 * ready in the router cache by the time it is clicked.
 */
export function SidebarNavLink({
  active = false,
  icon,
  label,
  description,
  trailing,
  collapsed = false,
  className,
  onClick,
  href,
  ...props
}: SidebarNavLinkProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && (state === "collapsed" || collapsed);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className={cn(
          "group/nav-link font-medium",
          isCollapsed && "justify-center",
          className,
        )}
      >
        <Link
          href={href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          data-active={active ? "true" : "false"}
          data-slot="sidebar-nav-link"
          title={isCollapsed ? label : undefined}
          aria-label={isCollapsed ? label : undefined}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-4 shrink-0 items-center justify-center [&>svg]:size-4 [&>svg]:stroke-[1.75]",
              active
                ? "text-foreground"
                : "text-muted-foreground group-hover/nav-link:text-foreground",
            )}
          >
            {icon}
          </span>
          {isCollapsed ? null : (
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[13px] tracking-normal",
                  active
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground/80 group-hover/nav-link:text-foreground",
                )}
              >
                {label}
              </span>
              {description ? (
                <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </span>
          )}
          {!isCollapsed && trailing ? (
            <span className="ml-auto shrink-0">{trailing}</span>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarCount({ count }: { count: number }) {
  if (count <= 0) return null;
  const visibleCount = count > 99 ? "99+" : count;
  return (
    <span
      aria-label={`${visibleCount} unread`}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10.5px] font-bold leading-none tabular-nums text-primary-foreground shadow-2xs"
    >
      {visibleCount}
    </span>
  );
}
