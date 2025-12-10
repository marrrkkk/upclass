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
  classColor: string
}

export function StreamTab({ classId, userRole, announcements, classColor }: StreamTabProps) {
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
      supabase?.removeChannel(channel)
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

  // Determine if we should show the 2-column layout
  const showSidebar = true // We can make this conditional based on props later

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
      {/* Sidebar - Upcoming Work */}
      <div className="hidden lg:block space-y-4">
        <Card className="border-l-4" style={{ borderLeftColor: classColor }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Upcoming</h3>
            </div>
            <p className="text-sm text-muted-foreground py-8 text-center">
              No work due soon
            </p>
            <div className="flex justify-end">
              <button
                className="text-xs font-medium hover:underline"
                style={{ color: classColor }}
                onClick={() => {
                  // Navigate to classwork tab via parent or router
                  // For now this is just a visual link
                }}
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Feed */}
      <div className="flex flex-col gap-4">
        {/* Create Announcement Input */}
        <Card className="shadow-sm overflow-hidden">
          {userRole === "teacher" ? (
            <div
              className="p-4 cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => setOpen(true)}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <Plus className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-full bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors text-left">
                  Announce something to your class...
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center gap-3 text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
              <p className="text-sm">Only teachers can post announcements.</p>
            </div>
          )}
        </Card>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 border-0 shadow-2xl">
            <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 border-b border-border/50">
              <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                Announcement
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 pb-4">
              <form id="announcement-form" action={handleCreate} className="space-y-4">
                <textarea
                  name="content"
                  required
                  placeholder="Announce something to your class..."
                  className="w-full min-h-[180px] resize-none border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground focus:ring-0 leading-relaxed"
                />
              </form>
            </div>
            {error && (
              <div className="px-6 pb-4">
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                  {error}
                </div>
              </div>
            )}
            <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-t backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {/* Add attachment buttons here in future */}
                <button type="button" className="p-2 rounded-full hover:bg-muted transition-all text-muted-foreground hover:text-foreground" title="Add attachment">
                  <div className="h-5 w-5 border-2 border-dashed border-current rounded-sm flex items-center justify-center opacity-60">
                    <Plus className="h-3 w-3" />
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                >
                  Cancel
                </button>
                <button
                  form="announcement-form"
                  type="submit"
                  disabled={pending}
                  className={cn(buttonVariants(), "text-white disabled:opacity-70 px-6 shadow-md hover:shadow-lg transition-all")}
                  style={{ backgroundColor: classColor }}
                >
                  {pending ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Announcements List */}
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
            {announcements.map((announcement) => {
              const authorInitial = announcement.author.name.charAt(0).toUpperCase()
              return (
                <Card key={announcement.id} className="group transition-all hover:shadow-md border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={announcement.author.image || undefined} alt={announcement.author.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">{authorInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-none">{announcement.author.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(announcement.createdAt)}</p>
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-full text-muted-foreground">
                        <div className="h-1 w-1 bg-current rounded-full mb-0.5" />
                        <div className="h-1 w-1 bg-current rounded-full mb-0.5" />
                        <div className="h-1 w-1 bg-current rounded-full" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{announcement.content}</p>
                  </CardContent>
                  <div className="px-6 py-3 border-t bg-muted/5 flex items-center gap-4">
                    {/* Comment placeholder */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" /> {/* User avatar placeholder */}
                      <div className="h-9 flex-1 rounded-full border bg-background px-3 text-sm text-muted-foreground flex items-center">
                        Add class comment...
                      </div>
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
