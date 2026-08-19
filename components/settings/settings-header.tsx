import { PageContainer, PageHeading } from "@/components/ui/section"

/**
 * Static Settings page frame: the container and real title/description with a
 * children slot for the settings body. Shared by `settings/page.tsx` and
 * `settings/loading.tsx` so the header paints instantly on navigation and
 * never drifts between loading and committed states.
 */
export function SettingsHeader({ children }: { children?: React.ReactNode }) {
  return (
    <PageContainer width="content">
      <PageHeading
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, privacy, notifications, and device preferences."
      />
      {children}
    </PageContainer>
  )
}