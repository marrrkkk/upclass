"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"

import { createAnnouncement } from "@/app/actions/class-detail"
import { AnnouncementCard } from "@/components/classes/announcement-card"
import { AnnouncementComposer } from "@/components/classes/announcement-composer"
import { useStreamRealtime } from "@/hooks/classes/use-stream-realtime"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"

import type { AnnouncementData } from "@/types/classes"

type StreamTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classColor: string
}

export function StreamTab({ classId, userId, userRole, announcements, classColor }: StreamTabProps) {
  const router = useRouter()
  const [announcementItems, setAnnouncementItems] = useState(announcements)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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

  const handleCreate = async (formData: FormData) => {
    setError(null)

    startTransition(async () => {
      const res = await executeWithOfflineHandling(
        () => createAnnouncement(classId, formData),
        "create-announcement",
        {
          classId,
          content: String(formData.get("content") || ""),
        },
      )

      if (res.queued) {
        setError("Announcement queued. It will be synced when you're back online.")
        setTimeout(() => setOpen(false), 2000)
        return
      }

      if (!res.success) {
        setError(res.error || "Failed to create announcement")
        return
      }

      setOpen(false)
    })
  }



  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-4 w-full">
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
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-muted-foreground/10 bg-muted/10">
            <div className="rounded-full bg-background p-4 shadow-sm mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userRole === "teacher"
                ? "Share updates, assignments, and more with your class."
                : "Check back later for updates from your teacher."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {announcementItems.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                userId={userId}
                classColor={classColor}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
