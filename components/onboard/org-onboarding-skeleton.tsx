import { Skeleton } from "@/components/ui/skeleton"

/** Streaming fallback that mirrors the org hero + card grid layout. */
export function OrgOnboardingSkeleton() {
  return (
    <div
      data-slot="org-shell"
      data-density="compact"
      className="app-shell-bg flex min-h-dvh flex-col text-foreground"
    >
      <header className="sticky top-0 z-30 shrink-0 border-b border-hairline/70 bg-background/95">
        <div className="mx-auto flex h-[var(--app-header-height)] w-full max-w-[88rem] items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </header>

      <main className="flex min-w-0 flex-1 flex-col justify-start">
        {/* Hero band */}
        <section className="relative overflow-hidden border-b border-hairline/70">
          <div className="mx-auto flex w-full max-w-[88rem] flex-col items-start gap-4 px-4 py-14 sm:gap-5 sm:px-6 sm:py-20 md:px-8">
            <Skeleton className="h-10 w-[min(28rem,80%)] rounded-lg sm:h-14" />
            <Skeleton className="h-4 w-56 rounded" />
            <Skeleton className="h-[var(--control-height-lg)] w-44 rounded-[var(--radius-buttons)]" />
          </div>
        </section>

        {/* Organization cards */}
        <section className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 px-4 py-10 sm:gap-5 sm:px-6 sm:py-12 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-8 w-32 rounded-[var(--radius-buttons)]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card"
              >
                <Skeleton className="h-24 rounded-none sm:h-28" />
                <div className="flex flex-col gap-2 p-4">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <div className="flex items-center justify-end border-t border-hairline px-4 py-2.5">
                  <Skeleton className="size-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 md:px-8">
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
