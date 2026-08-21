import { PageContainer, PageHeading } from "@/components/ui/section"
import { cn } from "@/lib/utils"

/**
 * Static Resources page frame: the container and the filter toolbar frame
 * with a children slot for the grid.
 */
export function ResourcesPageShell({
  filters,
  summary,
  actions,
  children,
  className,
}: {
  filters: React.ReactNode
  summary?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <PageContainer width="wide" className={cn("space-y-6 sm:space-y-8", className)}>
      <PageHeading
        eyebrow="Repository"
        title="Resources"
        description="Access and download class study materials, documents, presentations, and worksheets."
        actions={actions}
      />

      <div
        data-slot="filter-toolbar"
        role="search"
        aria-label="Resource filters"
        className="flex flex-col gap-3 rounded-xl border border-hairline/80 bg-card/80 p-2 sm:p-2.5 shadow-2xs backdrop-blur-xs lg:flex-row lg:items-center"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {filters}
        </div>
        {summary ? (
          <div className="sr-only" aria-live="polite">
            {summary}
          </div>
        ) : null}
      </div>

      {children}
    </PageContainer>
  )
}