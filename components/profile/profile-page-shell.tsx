import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/ui/section"
import { typographyVariants } from "@/lib/design-system"

/**
 * Static profile page frame: the container, cover band, avatar frame, and
 * static "Profile" eyebrow with skeleton name/actions and a children slot for
 * the stats/tabs data region. Shared by `user/[id]/page.tsx`,
 * `user/[id]/loading.tsx`, and `profile/loading.tsx` so the scaffold paints
 * instantly on navigation and never drifts between loading and committed
 * states.
 */
export function ProfilePageShell({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer width="content">
      <div className="overflow-hidden rounded-[var(--radius-floating)] bg-card shadow-e2">
        <Skeleton className="h-40 w-full sm:h-48" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="flex items-end gap-4">
            <Skeleton className="size-24 rounded-full border-4 border-card sm:-mt-8 sm:size-28" />
            <div className="space-y-2 pb-1">
              <p className={typographyVariants({ variant: "overline", tone: "muted" })}>Profile</p>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </div>
      {children}
    </PageContainer>
  )
}