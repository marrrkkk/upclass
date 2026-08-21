import { PageContainer, PageHeading } from "@/components/ui/section"

/**
 * Static Classes page frame: the container, real title/description, and an
 * optional actions slot. Shared by `classes/loading.tsx` (with skeleton
 * actions) and `ClassesClient` (with the real join/create buttons) so the
 * header never drifts between loading and committed states.
 */
export function ClassesPageShell({
  children,
  actions,
}: {
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <PageContainer width="full" className="space-y-6 sm:space-y-8">
      <PageHeading
        title="Classes"
        description="Find and open every class in this organization."
        className="pb-1"
        actions={actions}
      />
      {children}
    </PageContainer>
  )
}
