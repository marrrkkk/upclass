"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageSquare } from "lucide-react"

import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "@/app/actions/class-detail"
import { AnnouncementCard } from "@/components/classes/announcement-card"
import { AnnouncementComposer } from "@/components/classes/announcement-composer"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"
import { useStreamRealtime } from "@/hooks/classes/use-stream-realtime"
import type { AnnouncementData } from "@/types/classes"

type StreamTabProps = {
  classId: string
  currentUser: { id: string; name: string; image: string | null }
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classColor: string
}

type AnnouncementItem = AnnouncementData & { tempId?: string; pending?: boolean }

export function StreamTab({
  classId,
  currentUser,
  userId,
  userRole,
  announcements,
  classColor,
}: StreamTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [announcementItems, setAnnouncementItems] = useState<AnnouncementItem[]>(announcements)
  const [open, setOpen] = useState(
    () => userRole === "teacher" && searchParams?.get("create") === "1",
  )
  const [error, setError] = useState<string | null>(null)
  const { mutate, pending } = useOptimisticMutation<AnnouncementItem[]>(
    announcementItems,
    setAnnouncementItems,
  )

  useEffect(() => {
    setAnnouncementItems(announcements)
  }, [announcements])

  useStreamRealtime({
    classId,
    router,
    onAnnouncementPayload: (payload) => {
      const nextRecord = payload.new as { id?: string; content?: string } | null
      const prevRecord = payload.old as { id?: string } | null

      if (payload.eventType === "UPDATE" && nextRecord?.id) {
        setAnnouncementItems((current) =>
          current.map((announcement) =>
            announcement.id === nextRecord.id
              ? { ...announcement, content: nextRecord.content ?? announcement.content }
              : announcement,
          ),
        )
        return true
      }

      if (payload.eventType === "DELETE" && prevRecord?.id) {
        setAnnouncementItems((current) =>
          current.filter((announcement) => announcement.id !== prevRecord.id),
        )
        return true
      }

      return false
    },
    onReactionPayload: (payload) => {
      const nextRecord = payload.new as
        | { announcement_id?: string; user_id?: string; reaction?: string }
        | null
      const prevRecord = payload.old as
        | { announcement_id?: string; user_id?: string; reaction?: string }
        | null
      const announcementId = nextRecord?.announcement_id || prevRecord?.announcement_id
      const reactionUserId = nextRecord?.user_id || prevRecord?.user_id

      if (!announcementId || !reactionUserId) return false

      setAnnouncementItems((current) =>
        current.map((announcement) => {
          if (announcement.id !== announcementId) return announcement

          const reactions = announcement.reactions.filter(
            (reaction) => reaction.userId !== reactionUserId,
          )

          if (payload.eventType !== "DELETE" && nextRecord?.reaction) {
            reactions.push({
              userId: reactionUserId,
              reaction: nextRecord.reaction,
            })
          }

          return {
            ...announcement,
            reactions,
          }
        }),
      )

      return true
    },
  })

  const handleCreate = (formData: FormData) => {
    setError(null)

    const content = String(formData.get("content") || "").trim()
    if (!content) return

    const tempId = `announcement-${crypto.randomUUID()}`
    const optimisticItem: AnnouncementItem = {
      id: tempId,
      tempId,
      pending: true,
      content,
      createdAt: new Date().toISOString(),
      author: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
      },
      reactions: [],
    }

    void mutate(
      (previous) => [optimisticItem, ...previous],
      () => createAnnouncement(classId, formData),
      {
        offline: {
          type: "create-announcement",
          payload: {
            classId,
            content,
            tempId,
          },
        },
        queued: {
          tempId,
          remove: (current) => current.filter((item) => item.tempId !== tempId),
        },
        onSuccess: (_result, current) => {
          // Announcements return no ID: drop the placeholder and let the
          // server refresh/realtime bring in the real row.
          setOpen(false)
          router.refresh()
          return current.filter((item) => item.tempId !== tempId)
        },
        onError: (_message, current) => current.filter((item) => item.tempId !== tempId),
      },
    )

    // The optimistic item is already in the stream: close immediately.
    setOpen(false)
  }

  const handleUpdate = (announcementId: string, content: string) => {
    setError(null)

    void mutate(
      (previous) =>
        previous.map((item) =>
          item.id === announcementId ? { ...item, content } : item,
        ),
      () => updateAnnouncement(announcementId, content),
      {
        onSuccess: (_result, current) => {
          setOpen(false)
          router.refresh()
          return current
        },
      },
    )
  }

  const handleDelete = (announcementId: string) => {
    setError(null)

    void mutate(
      (previous) => previous.filter((item) => item.id !== announcementId),
      () => deleteAnnouncement(announcementId),
      {
        onSuccess: (_result, current) => {
          router.refresh()
          return current
        },
      },
    )
  }

  return (
    <section className="space-y-4">
      <AnnouncementComposer
        classColor={classColor}
        error={error}
        open={open}
        pending={pending}
        userRole={userRole}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        onSubmit={handleCreate}
      />

      {announcementItems.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            icon={<MessageSquare />}
            title="No announcements yet"
            description={
              userRole === "teacher"
                ? "Share updates, assignments, and more with your class."
                : "Check back later for updates from your teacher."
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {announcementItems.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              userId={userId}
              classColor={classColor}
              userRole={userRole}
              pending={pending}
              onUpdate={(content) => handleUpdate(announcement.id, content)}
              onDelete={() => handleDelete(announcement.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}