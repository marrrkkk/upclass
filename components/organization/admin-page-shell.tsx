import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeading } from "@/components/ui/section"

/**
 * Static admin page frame: the container, the static "Organization" eyebrow,
 * and skeleton title/description/actions with a children slot for the data
 * region. Shared by `admin/page.tsx` and `admin/loading.tsx` so the frame
 * paints instantly on navigation and never drifts between loading and
 * committed states.
 */
export function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer width="wide">
      <PageHeading
        eyebrow="Organization"
        title={<Skeleton className="h-8 w-56" />}
        description={<Skeleton className="h-4 w-full max-w-md" />}
        media={<Skeleton className="hidden size-14 rounded-2xl sm:block" />}
        actions={
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        }
      />
      {children}
    </PageContainer>
  )
}