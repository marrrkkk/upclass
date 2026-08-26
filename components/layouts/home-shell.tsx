import Link from "next/link";

import { cn } from "@/lib/utils";
import { BackgroundRefreshClient } from "@/components/layouts/background-refresh-client";
import { AppCommandMenu } from "@/components/layouts/app-command-menu";
import { HomeShellSidebarToggle } from "@/components/layouts/home-shell-sidebar-toggle";
import { SidebarCollapseToggle } from "@/components/layouts/sidebar-collapse-toggle";
import { KeyboardShortcuts } from "@/components/layouts/keyboard-shortcuts";
import { MobileNavigation } from "@/components/layouts/mobile-navigation";
import { NavigationProgress } from "@/components/layouts/navigation-progress";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AiPanelProvider } from "@/components/ai/ai-panel-provider";
import { AiSidePanel } from "@/components/ai/ai-side-panel";
import { Sidebar } from "@/components/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { responsive } from "@/lib/design-system";
import type { OrgRole } from "@/types/organization";

type HomeShellProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
  /**
   * True while the shell's server data is still streaming (Suspense fallback).
   * Renders the sidebar and header structure without any authentication CTAs.
   */
  pending?: boolean;
  recentClasses?: Array<{ id: string; title: string; color: string | null }>;
  userInfo?: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  userId?: string;
  organizationRole?: OrgRole | null;
  defaultSidebarOpen?: boolean;
};

export function HomeShell({
  children,
  isAuthenticated,
  pending = false,
  recentClasses,
  userInfo,
  userId,
  organizationRole,
  defaultSidebarOpen = true,
}: HomeShellProps) {
  return (
    <div
      className="app-shell-bg h-dvh min-h-dvh overflow-hidden"
      data-density="compact"
      data-slot="app-shell"
    >
      <a
        href="#main-content"
        className="focus-ring fixed left-4 top-3 z-[90] -translate-y-20 rounded-md bg-primary px-3 py-2 type-small font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <BackgroundRefreshClient />
      <NavigationProgress />
      {isAuthenticated ? <KeyboardShortcuts /> : null}

      <AiPanelProvider>
        <SidebarProvider
          defaultOpen={defaultSidebarOpen}
          className="h-full min-h-0"
        >
          {isAuthenticated || pending ? (
            <Sidebar
              recentClasses={recentClasses}
              userId={userId}
              userInfo={userInfo}
              organizationRole={organizationRole}
            />
          ) : null}

          <SidebarInset className="h-full min-h-0 overflow-hidden">
            <header className="sticky top-0 z-30 shrink-0 border-b border-hairline/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="flex h-[var(--app-header-height)] items-center gap-2 px-3 sm:px-4 md:px-5">
                <HomeShellSidebarToggle />
                <SidebarCollapseToggle />
                {pending ? (
                  <div
                    data-slot="home-shell-header-skeleton"
                    className="ml-auto flex w-full items-center justify-end"
                  >
                    <div
                      aria-hidden="true"
                      className="h-7 w-full max-w-56 animate-pulse rounded-lg bg-muted/70"
                    />
                  </div>
                ) : isAuthenticated && userInfo ? (
                  <>
                    <PageHeader user={userInfo} userId={userId} />
                  </>
                ) : !isAuthenticated ? (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="type-small text-muted-foreground">
                      Welcome to UpClass
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/sign-in">Sign in</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/sign-up">Get started</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
                {isAuthenticated ? (
                  <div className="hidden" aria-hidden="true">
                    <AppCommandMenu />
                  </div>
                ) : null}
              </div>
            </header>

            <main
              id="main-content"
              tabIndex={-1}
              className={cn(
                "minimal-scrollbar min-w-0 flex-1 overflow-y-auto scroll-mt-16",
                responsive.pagePadding,
              )}
            >
              {children}
            </main>
          </SidebarInset>

          {isAuthenticated ? (
            <AiSidePanel organizationRole={organizationRole} />
          ) : null}

          <MobileNavigation isAuthenticated={isAuthenticated} />
        </SidebarProvider>
      </AiPanelProvider>
    </div>
  );
}
