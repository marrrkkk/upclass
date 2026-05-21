"use client"

import { useRouter } from "next/navigation"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"

import { useOrgStore } from "@/stores/org-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type OrgSwitcherProps = {
  onCreateOrg?: () => void
}

export function OrgSwitcher({ onCreateOrg }: OrgSwitcherProps) {
  const router = useRouter()
  const { activeOrgSlug, orgs, setActiveOrg } = useOrgStore()

  const activeOrg = orgs.find((o) => o.slug === activeOrgSlug)

  function handleSwitchOrg(slug: string) {
    setActiveOrg(slug)
    router.push(`/${slug}`)
  }

  if (orgs.length === 0 && !onCreateOrg) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {activeOrg ? (
            <>
              <Avatar className="size-6 rounded-md">
                <AvatarImage src={activeOrg.logo ?? undefined} alt={activeOrg.name} />
                <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs font-semibold">
                  {activeOrg.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-left font-medium">
                {activeOrg.name}
              </span>
            </>
          ) : (
            <>
              <div className="flex size-6 items-center justify-center rounded-md bg-muted">
                <Building2 className="size-3.5 text-muted-foreground" />
              </div>
              <span className="flex-1 truncate text-left text-muted-foreground">
                Select organization
              </span>
            </>
          )}
          <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Organizations
        </DropdownMenuLabel>

        {orgs.length === 0 ? (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            No organizations yet
          </div>
        ) : (
          <DropdownMenuGroup>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.slug}
                onClick={() => handleSwitchOrg(org.slug)}
              >
                <Avatar className="size-5 rounded-md">
                  <AvatarImage src={org.logo ?? undefined} alt={org.name} />
                  <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                    {org.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{org.name}</span>
                {org.slug === activeOrgSlug && (
                  <Check className="ml-auto size-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onCreateOrg}>
          <Plus className="size-4" />
          <span>Create Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
