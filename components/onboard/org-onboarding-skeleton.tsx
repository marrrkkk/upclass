import { Skeleton } from "@/components/ui/skeleton"

/** Streaming fallback that mirrors the workspace directory layout. */
export function OrgOnboardingSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-hairline bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[88rem] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="hidden h-5 w-24 rounded-full sm:inline-block" />
          </div>
          <Skeleton className="h-4 w-28 rounded" />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-[72rem] space-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
          <div className="max-w-3xl space-y-3.5">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
            <Skeleton className="h-5 w-[32rem] max-w-full rounded" />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
            <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-e1">
              <div className="flex min-h-16 items-center justify-between border-b border-hairline bg-surface/60 px-5 py-4 sm:px-6">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-24 items-center gap-4 border-b border-hairline px-5 py-4.5 last:border-0 sm:px-6"
                >
                  <Skeleton className="size-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40 rounded" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-64 max-w-full rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-e1">
              <div className="space-y-1.5 border-b border-hairline bg-primary-surface/60 px-5 py-4">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-5 w-44 rounded" />
              </div>
              <div className="space-y-2 p-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="mx-2 h-px bg-hairline/60" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline bg-surface/50">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <Skeleton className="h-3 w-32 rounded" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        </div>
      </footer>
    </div>
  )
}

