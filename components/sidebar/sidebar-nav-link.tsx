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
 * Active state highlights with a refined tinted background, border, bold typography,
 * and an accented icon.
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
          "group/nav-link",
          active && "font-semibold shadow-2xs",
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
              "flex shrink-0 items-center justify-center transition-colors [&>svg]:size-4 [&>svg]:stroke-[2]",
              active
                ? "text-primary [&>svg]:text-primary"
                : "text-muted-foreground/75 group-hover/nav-link:text-foreground",
            )}
          >
            {icon}
          </span>
          {isCollapsed ? null : (
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[13.5px] tracking-[-0.01em]",
                  active
                    ? "font-semibold text-foreground"
                    : "font-semibold text-foreground/80 group-hover/nav-link:text-foreground",
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
