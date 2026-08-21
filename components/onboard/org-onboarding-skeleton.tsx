import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/ui/section"

/** Streaming fallback that mirrors the workspace directory layout. */
export function OrgOnboardingSkeleton() {
  return (
    <div
      data-slot="org-shell"
      data-density="compact"
      className="app-shell-bg flex min-h-dvh flex-col text-foreground"
    >
      <header className="sticky top-0 z-30 shrink-0 border-b border-hairline/70 bg-background/95">
        <div className="mx-auto flex h-[var(--app-header-height)] w-full max-w-[88rem] items-center justify-between gap-3 px-3 sm:px-4 md:px-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center">
        <PageContainer width="content" className="flex w-full flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:py-12">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-48 rounded" />
            <Skeleton className="h-8 w-72 max-w-full rounded-lg" />
            <Skeleton className="h-4 w-[28rem] max-w-full rounded" />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-6">
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
              <div className="flex min-h-14 items-center justify-between border-b border-hairline bg-surface-sunken/40 px-4 py-3.5 sm:px-5">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-20 items-center gap-4 border-b border-hairline px-4 py-3.5 last:border-0 sm:px-5"
                >
                  <Skeleton className="size-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-40 max-w-full rounded" />
                    <Skeleton className="h-3 w-64 max-w-full rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="hidden h-4 w-12 rounded sm:block" />
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
              <div className="flex flex-col gap-2 border-b border-hairline px-4 py-3.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-48 max-w-full rounded" />
              </div>
              <div className="flex flex-col gap-2 p-2.5">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </PageContainer>
      </main>

      <footer className="shrink-0 border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <Skeleton className="h-3 w-28 rounded" />
          <div className="flex items-center gap-5">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        </div>
      </footer>
    </div>
  )
}
