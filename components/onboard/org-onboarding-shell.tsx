import type { ReactNode } from "react"
import Link from "next/link"

import { ArrowUpRight, LifeBuoy } from "lucide-react"
import { Logo } from "@/components/logo"
import { PageContainer } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type OrgOnboardingShellProps = { headerActions?: ReactNode; width?: "narrow" | "content" | "wide"; contentClassName?: string; wizardMode?: boolean; children: ReactNode }

export function OrgOnboardingShell({ headerActions, width = "content", contentClassName, wizardMode = false, children }: OrgOnboardingShellProps) {
  return <div className="entry-shell org-entry flex min-h-dvh flex-col bg-background text-foreground"><header className="entry-header org-topbar sticky top-0 z-20 border-b border-hairline bg-background/90 backdrop-blur-md"><PageContainer width="wide" className="flex h-16 flex-row items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-6"><Logo href="/" size="md" /><nav className="org-topnav-links hidden items-center gap-5 md:flex" aria-label="Workspace navigation"><Link href="/org">Workspaces</Link><Link href="/contact">Support</Link></nav></div><div className="flex min-w-0 items-center gap-3"><span className="org-nav-context hidden items-center gap-1.5 sm:inline-flex"><LifeBuoy />Need a hand?</span>{headerActions}<Link href="/" className="org-nav-exit inline-flex items-center gap-1.5 rounded-md px-2.5 py-2"><ArrowUpRight />Exit</Link></div></PageContainer></header><main className={cn("org-main flex flex-1 flex-col", wizardMode ? "justify-start" : "justify-center")}><PageContainer width={width} className={cn("w-full px-4 py-10 sm:px-6 sm:py-14 lg:py-16", wizardMode && "pb-24 lg:pb-16", contentClassName)}>{children}</PageContainer></main><footer className="entry-footer border-t border-hairline bg-surface/50"><PageContainer width="wide" className="flex flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6"><Text variant="caption" tone="subtle">&copy; {new Date().getFullYear()} UpClass</Text><nav aria-label="Legal" className="flex items-center gap-6">{[{ href: "/", label: "Home" }, { href: "/contact", label: "Support" }, { href: "/terms", label: "Terms" }, { href: "/privacy", label: "Privacy" }].map((item) => <Text key={item.href} variant="caption" tone="muted" asChild><Link className="focus-ring rounded-sm hover:text-foreground" href={item.href}>{item.label}</Link></Text>)}</nav></PageContainer></footer></div>
}
