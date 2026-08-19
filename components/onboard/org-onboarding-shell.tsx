import type { ReactNode } from "react"
import Link from "next/link"

import { Logo } from "@/components/logo"
import { PageContainer } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type OrgOnboardingShellProps = {
  headerActions?: ReactNode
  width?: "narrow" | "content" | "wide"
  contentClassName?: string
  /** When true, main content uses top-aligned wizard layout instead of vertical centering. */
  wizardMode?: boolean
  children: ReactNode
}

/** Shared, calm entry shell for selecting, creating, and joining workspaces. */
export function OrgOnboardingShell({
  headerActions,
  width = "content",
  contentClassName,
  wizardMode = false,
  children,
}: OrgOnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-hairline bg-background/90 backdrop-blur-md">
        <PageContainer
          width="wide"
          className="flex h-16 flex-row items-center justify-between space-y-0 px-4 sm:space-y-0 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <Logo href="/" size="md" />
            <span className="hidden sm:inline-block text-hairline-strong">/</span>
            <StatusBadge tone="neutral" size="sm" className="hidden sm:inline-flex">
              Workspaces
            </StatusBadge>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {headerActions}
            <Link
              href="/"
              className="hidden text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Back to overview
            </Link>
          </div>
        </PageContainer>
      </header>

      <main className={cn("flex flex-1 flex-col", wizardMode ? "justify-start" : "justify-center")}>
        <PageContainer
          width={width}
          className={cn(
            "w-full space-y-0 px-4 py-10 sm:space-y-0 sm:px-6 sm:py-14 lg:py-16",
            wizardMode && "pb-24 lg:pb-16",
            contentClassName,
          )}
        >
          {children}
        </PageContainer>
      </main>

      <footer className="border-t border-hairline bg-surface/50">
        <PageContainer
          width="wide"
          className="flex flex-col items-center justify-between gap-3 space-y-0 px-4 py-5 sm:flex-row sm:space-y-0 sm:px-6"
        >
          <Text variant="caption" tone="subtle">
            &copy; {new Date().getFullYear()} UpClass
          </Text>
          <nav aria-label="Legal" className="flex items-center gap-6">
            {[
              { href: "/", label: "Home" },
              { href: "/contact", label: "Support" },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
            ].map((item) => (
              <Text key={item.href} variant="caption" tone="muted" asChild>
                <Link className="focus-ring rounded-sm hover:text-foreground transition-colors" href={item.href}>
                  {item.label}
                </Link>
              </Text>
            ))}
          </nav>
        </PageContainer>
      </footer>
    </div>
  )
}

