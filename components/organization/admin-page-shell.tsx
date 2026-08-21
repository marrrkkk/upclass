import { PageContainer } from "@/components/ui/section"

/**
 * Stable admin page frame for the async data region. The organization-specific
 * heading belongs to the committed client view so the route never renders a
 * second, stale heading above it.
 */
export function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer width="wide" className="py-6 sm:py-8">
      {children}
    </PageContainer>
  )
}
