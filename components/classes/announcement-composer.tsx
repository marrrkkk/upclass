"use client"

import { MessageSquare, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"

type AnnouncementComposerProps = {
  classColor: string
  error: string | null
  open: boolean
  pending: boolean
  userRole: "teacher" | "student" | null
  onClose: () => void
  onOpen: () => void
  onSubmit: (formData: FormData) => void
}

export function AnnouncementComposer({
  error,
  open,
  pending,
  userRole,
  onClose,
  onOpen,
  onSubmit,
}: AnnouncementComposerProps) {
  if (userRole !== "teacher") return null

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 transition-all duration-200 hover:border-primary-border/60 hover:shadow-e2">
        <button
          type="button"
          className="focus-ring flex w-full items-center gap-3.5 p-4 text-left sm:px-5"
          onClick={onOpen}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <Text variant="h4" className="font-semibold">Post an announcement</Text>
            <Text variant="caption" tone="muted">Share an update with everyone in this class.</Text>
          </div>
        </button>
      </div>

      <ResponsiveOverlay
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && onClose()}
        title={
          <span className="flex items-center gap-2">
            <IconBadge tone="primary" size="sm">
              <MessageSquare />
            </IconBadge>
            Announcement
          </span>
        }
        description="Share a concise update with this class."
        desktopClassName="sm:max-w-[38rem]"
        footer={
          <>
            <Button type="button" variant="ghost" className="h-9 rounded-lg" onClick={onClose}>
              Cancel
            </Button>
            <Button
              form="announcement-form"
              type="submit"
              className="h-9 rounded-lg font-semibold"
              isLoading={pending}
              disabled={pending}
            >
              Post announcement
            </Button>
          </>
        }
      >
        <form id="announcement-form" action={onSubmit}>
          <Textarea
            name="content"
            required
            placeholder="Announce something to your class..."
            className="min-h-40 rounded-xl resize-none"
          />
        </form>
        {error ? <Callout tone="danger" role="alert" className="mt-4">{error}</Callout> : null}
      </ResponsiveOverlay>
    </>
  )
}
