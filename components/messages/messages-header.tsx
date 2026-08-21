import { PageHeading } from "@/components/ui/section"

/**
 * Static Messages page heading, shared by `messages/page.tsx` and
 * `messages/loading.tsx` so the title and description paint instantly on
 * navigation and never drift between loading and committed states.
 */
export function MessagesHeader() {
  return (
    <PageHeading
      eyebrow="Communication"
      title="Messages"
      description="Connect with your classmates and teachers."
    />
  )
}