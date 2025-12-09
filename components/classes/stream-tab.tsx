"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createAnnouncement } from "@/app/actions/class-detail"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type AnnouncementData = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    image: string | null
  }
}

type StreamTabProps = {
  classId: string
  userRole: "teacher" | "student"
  announcements: AnnouncementData[]
}

export function StreamTab({ classId, userRole, announcements }: StreamTabProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Set up realtime subscription for announcements
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`announcements:${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          // Refresh the page data when announcements change
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classId, router])

  const handleCreate = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await createAnnouncement(classId, formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setOpen(false)
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create Announcement Button (only for teachers) */}
      {userRole === "teacher" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className={cn(buttonVariants({ size: "sm" }), "w-fit gap-2 bg-blue-600 hover:bg-blue-700")}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Create announcement
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share an announcement with your class.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Content</span>
                <textarea
                  name="content"
                  required
                  placeholder="What's on your mind?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  rows={5}
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700 disabled:opacity-70")}
                >
                  {pending ? "Posting..." : "Post"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No announcements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => {
            const authorInitial = announcement.author.name.charAt(0).toUpperCase()
            return (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={announcement.author.image || undefined} alt={announcement.author.name} />
                      <AvatarFallback>{authorInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{announcement.author.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

