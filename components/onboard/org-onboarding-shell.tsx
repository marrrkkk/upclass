"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { HelpCircle, LogOut, Loader2 } from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageContainer } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export type OrgShellViewer = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

type OrgOnboardingShellProps = {
  headerActions?: ReactNode
  width?: "narrow" | "content" | "wide"
  contentClassName?: string
  wizardMode?: boolean
  viewer?: OrgShellViewer | null
  children: ReactNode
}

/**
 * Pre-tenant shell for `/org` routes.
 *
 * Mirrors the authenticated app chrome (canvas background, sticky header,
 * page container rhythm) so workspace selection feels like the product, not a
 * separate marketing entry screen.
 */
export function OrgOnboardingShell({
  headerActions,
  width = "content",
  contentClassName,
  wizardMode = false,
  viewer,
  children,
}: OrgOnboardingShellProps) {
  return (
    <div
      data-slot="org-shell"
      data-density="compact"
      className="app-shell-bg flex min-h-dvh flex-col text-foreground"
    >
      <a
        href="#org-main-content"
        className="focus-ring fixed left-4 top-3 z-[90] -translate-y-20 rounded-md bg-primary px-3 py-2 type-small font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 shrink-0 border-b border-hairline/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-[var(--app-header-height)] w-full max-w-[88rem] items-center gap-3 px-3 sm:px-4 md:px-5">
          <Logo href="/org" size="md" />

          {headerActions ? (
            <div className="min-w-0 flex-1">{headerActions}</div>
          ) : (
            <nav
              className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
              aria-label="Workspace navigation"
            >
              <Button variant="ghost" size="sm" asChild>
                <Link href="/org">Workspaces</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/contact">Support</Link>
              </Button>
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!headerActions ? (
              <Button variant="ghost" size="icon-sm" className="md:hidden" asChild>
                <Link href="/contact" aria-label="Support">
                  <HelpCircle />
                </Link>
              </Button>
            ) : null}
            {viewer ? <OrgAccountMenu viewer={viewer} /> : null}
          </div>
        </div>
      </header>

      <main
        id="org-main-content"
        tabIndex={-1}
        className={cn(
          "minimal-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto",
          wizardMode ? "justify-start" : "justify-center",
        )}
      >
        <PageContainer
          width={width}
          className={cn(
            "w-full px-4 py-8 sm:px-6 sm:py-10 md:py-12",
            wizardMode && "pb-24 lg:pb-12",
            contentClassName,
          )}
        >
          {children}
        </PageContainer>
      </main>

      <footer className="shrink-0 border-t border-hairline/70 bg-background">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <Text variant="caption" tone="subtle">
            &copy; {new Date().getFullYear()} UpClass
          </Text>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { href: "/contact", label: "Support" },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
            ].map((item) => (
              <Text key={item.href} variant="caption" tone="muted" asChild>
                <Link className="focus-ring rounded-sm hover:text-foreground" href={item.href}>
                  {item.label}
                </Link>
              </Text>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}

function OrgAccountMenu({ viewer }: { viewer: OrgShellViewer }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const label = viewer.name?.trim() || viewer.email || "Account"

  const handleSignOut = async () => {
    try {
      setPending(true)
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/")
            router.refresh()
          },
        },
      })
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="focus-ring flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
        >
          <EntityAvatar
            name={label}
            image={viewer.image}
            colorKey={viewer.id ?? viewer.email ?? label}
            size="sm"
          />
          <span className="hidden min-w-0 max-w-[9rem] truncate type-caption font-medium text-muted-foreground sm:inline">
            {label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <div className="flex items-center gap-3 p-2">
          <EntityAvatar
            name={label}
            image={viewer.image}
            colorKey={viewer.id ?? viewer.email ?? label}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate type-small font-semibold text-foreground">
              {viewer.name?.trim() || "UpClass user"}
            </p>
            {viewer.email ? (
              <p className="truncate type-caption text-muted-foreground">{viewer.email}</p>
            ) : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/contact" className="cursor-pointer">
              <HelpCircle className="mr-2 size-4 text-muted-foreground" />
              <span>Support</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={pending}
          className="cursor-pointer text-destructive focus:bg-destructive-surface focus:text-destructive-text"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          <span>{pending ? "Signing out…" : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
