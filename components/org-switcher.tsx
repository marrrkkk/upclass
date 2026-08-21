"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganizations } from "@/hooks/use-organizations"
import { ORG_ROLE_LABELS } from "@/types/organization"

/**
 * Workspace switcher for the sidebar.
 *
 * Reads as one object rather than a generic form control: monogram, name, and
 * the current role underneath. Subtle tactile container with bold typography.
 */
export function OrgSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter()
  const { currentOrg, organizations, setCurrentOrg, isLoading } = useOrganizations()

  const handleOrgChange = (orgId: string) => {
    const organization = organizations.find((item) => item.id === orgId)
    if (!organization || organization.id === currentOrg?.id) return

    setCurrentOrg(organization)
    router.push(`/${organization.slug}/dashboard`)
    router.refresh()
  }

  if (isLoading && !currentOrg) {
    return (
      <div
        className={cn(
          "flex items-center rounded-lg py-1.5",
          collapsed ? "justify-center" : "gap-2.5 px-2",
        )}
      >
        <Skeleton className="size-7 rounded-md" />
        {collapsed ? null : <Skeleton className="h-3 w-24" />}
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <button
        type="button"
        onClick={() => router.push("/org")}
        title={collapsed ? "Add organization" : undefined}
        aria-label={collapsed ? "Add organization" : undefined}
        className={cn(
          "focus-ring flex w-full items-center rounded-lg border border-dashed border-hairline-strong bg-transparent py-2 text-left transition-[background-color,border-color] duration-[var(--duration-fast)] ease-out-expo hover:border-primary-border hover:bg-primary-surface/50",
          collapsed ? "justify-center" : "gap-2.5 px-2.5",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-surface text-primary-text">
          <Plus aria-hidden="true" className="size-3.5" />
        </span>
        {collapsed ? null : (
          <span className="min-w-0 flex-1">
            <span className={cn(typographyVariants({ variant: "h4" }), "block truncate font-semibold")}>
              Add organization
            </span>
            <span className={cn(typographyVariants({ variant: "caption", tone: "subtle" }), "block")}>
              Create or join a workspace
            </span>
          </span>
        )}
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Current organization: ${currentOrg.name}. Switch organization`}
          title={collapsed ? currentOrg.name : undefined}
          className={cn(
            "focus-ring group flex w-full items-center rounded-lg p-1.5 text-left transition-colors hover:bg-muted",
            collapsed ? "justify-center" : "gap-2.5",
          )}
        >
          <EntityAvatar
            name={currentOrg.name}
            colorKey={currentOrg.slug}
            shape="square"
            size="sm"
            className="size-7 rounded-md font-bold text-xs"
          />
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {currentOrg.name}
              </span>
              <ChevronsUpDown
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground/60 transition-colors duration-150 group-hover:text-foreground group-data-[state=open]:text-foreground"
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[15rem]">
        <DropdownMenuLabel
          className={cn(typographyVariants({ variant: "overline", tone: "subtle" }), "px-2.5 py-2 font-bold tracking-wider uppercase text-[10.5px]")}
        >
          Organizations
        </DropdownMenuLabel>

        {organizations.map((organization) => {
          const isActive = organization.id === currentOrg.id

          return (
            <DropdownMenuItem
              key={organization.id}
              onClick={() => handleOrgChange(organization.id)}
              className={cn("gap-2.5", isActive && "bg-primary-surface text-primary-text font-medium")}
            >
              <EntityAvatar
                name={organization.name}
                colorKey={organization.slug}
                shape="square"
                size="xs"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{organization.name}</span>
                <span
                  className={cn(
                    typographyVariants({ variant: "caption", tone: "subtle" }),
                    "block truncate text-[11px]",
                  )}
                >
                  {ORG_ROLE_LABELS[organization.role]}
                </span>
              </span>
              {isActive ? (
                <Check aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
              ) : null}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/org")}>
          <Plus aria-hidden="true" className="size-4" />
          <span className="font-medium">Create or join</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
