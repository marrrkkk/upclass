"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"

import { createAnnouncement } from "@/app/actions/class-detail"
import { AnnouncementCard } from "@/components/classes/announcement-card"
import { AnnouncementComposer } from "@/components/classes/announcement-composer"
import { useStreamRealtime } from "@/components/classes/use-stream-realtime"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"

import type { AnnouncementData } from "@/components/classes/types"

type StreamTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classColor: string
}

export function StreamTab({ classId, userId, userRole, announcements, classColor }: StreamTabProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useStreamRealtime(classId, router)

  const handleCreate = async (formData: FormData) => {
    setError(null)
    
    if (!navigator.onLine) {
      setError("You're offline. Please check your internet connection and try again.")
      return
    }

    startTransition(async () => {
      const res = await executeWithOfflineHandling(
        () => createAnnouncement(classId, formData),
        'create-announcement',
        { classId, ...Object.fromEntries(formData.entries()) }
      )

      if (!res.success) {
        setError(res.error || "Failed to create announcement")
        return
      }

      if (res.queued) {
        setError("Announcement queued. It will be synced when you're back online.")
        setTimeout(() => setOpen(false), 2000)
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

        {announcements.length === 0 ? (
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
            {announcements.map((announcement) => (
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
