import { PageContainer } from "@/components/ui/section"

/**
 * Shared profile page container. The localized Suspense fallback owns the
 * identity skeleton so the committed page never renders duplicate headers.
 */
export function ProfilePageShell({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer width="content">
      <section aria-label="Profile content" className="space-y-5 sm:space-y-6">{children}</section>
    </PageContainer>
  )
}
