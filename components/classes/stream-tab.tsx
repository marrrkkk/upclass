"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, Heart, SmilePlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createAnnouncement, toggleReaction } from "@/app/actions/class-detail"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type AnnouncementReaction = {
  userId: string
  reaction: string
}

type AnnouncementData = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    image: string | null
  }
  reactions: AnnouncementReaction[]
}

type StreamTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classColor: string
}

const REACTION_EMOJIS: Record<string, { emoji: string, label: string }> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😡", label: "Angry" },
}

function AnnouncementCard({ announcement, userId, classColor }: { announcement: AnnouncementData, userId?: string, classColor: string }) {
  // Find user's current reaction
  const initialUserReaction = userId ? announcement.reactions.find(r => r.userId === userId)?.reaction : null

  const [reactionState, setReactionState] = useState({
    count: announcement.reactions.length,
    hasReacted: !!initialUserReaction,
    userReaction: initialUserReaction || null
  })

  // Sync state with prop changes
  useEffect(() => {
    const freshUserReaction = userId ? announcement.reactions.find(r => r.userId === userId)?.reaction : null
    setReactionState({
      count: announcement.reactions.length,
      hasReacted: !!freshUserReaction,
      userReaction: freshUserReaction || null
    })
  }, [announcement.reactions, userId])

  const handleReaction = async (type: string) => {
    if (!userId) return

    const isTogglingOff = reactionState.userReaction === type

    // Optimistic update
    setReactionState(prev => {
      let newCount = prev.count
      if (!prev.hasReacted) newCount++ // New reaction
      else if (isTogglingOff) newCount-- // Removing reaction
      // If switching, count stays same

      return {
        hasReacted: !isTogglingOff,
        userReaction: isTogglingOff ? null : type,
        count: Math.max(0, newCount)
      }
    })

    try {
      await toggleReaction(announcement.id, type)
    } catch (error) {
      console.error("Failed to toggle reaction", error)
    }
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

  const authorInitial = announcement.author.name.charAt(0).toUpperCase()

  return (
    <Card className="group transition-all hover:shadow-md border-border/60 overflow-hidden relative border-l-[6px]" style={{ borderLeftColor: classColor }}>
      <CardHeader className="pb-3 pl-5">
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
      <CardContent className="pl-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{announcement.content}</p>
      </CardContent>
      <div className="px-6 py-3 border-t bg-muted/5 flex items-center justify-between pl-5">
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={!userId}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all group/rx focus:outline-none",
                  reactionState.hasReacted
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Add reaction"
              >
                {reactionState.hasReacted && reactionState.userReaction ? (
                  <>
                    <span className="text-base leading-none">{REACTION_EMOJIS[reactionState.userReaction]?.emoji || "👍"}</span>
                    <span className="capitalize">{REACTION_EMOJIS[reactionState.userReaction]?.label || "Liked"}</span>
                  </>
                ) : (
                  <>
                    <SmilePlus className="h-4 w-4 stroke-current opacity-70 group-hover/rx:opacity-100" />
                    <span>Reaction</span>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex gap-1 p-1 min-w-0">
              {Object.entries(REACTION_EMOJIS).map(([key, { emoji, label }]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleReaction(key)}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-full cursor-pointer hover:bg-muted text-xl transition-transform hover:scale-125 focus:bg-muted",
                    reactionState.userReaction === key && "bg-blue-50 ring-1 ring-blue-200"
                  )}
                  title={label}
                >
                  {emoji}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(() => {
            // Calculate top 3 reactions from the actual props (not optimistic state for accuracy)
            const reactionCounts: Record<string, number> = {}
            announcement.reactions.forEach(r => {
              reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1
            })

            const sortedReactions = Object.entries(reactionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)

            const totalCount = announcement.reactions.length

            if (totalCount === 0) return null

            return (
              <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full cursor-default" title={`${totalCount} reaction${totalCount !== 1 ? 's' : ''}`}>
                <div className="flex -space-x-1">
                  {sortedReactions.map(([type]) => (
                    <span key={type} className="text-sm leading-none">
                      {REACTION_EMOJIS[type]?.emoji || "👍"}
                    </span>
                  ))}
                </div>
                <span className="font-medium">{totalCount}</span>
              </div>
            )
          })()}
        </div>
      </div>
    </Card>
  )
}

export function StreamTab({ classId, userId, userRole, announcements, classColor }: StreamTabProps) {
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
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_reactions"
        },
        () => {
          // We could try to be more specific with filter but global refresh is safer for now
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



  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Sidebar - Upcoming Work (Hidden for now to allow full width stream) */}
      {/* <div className="hidden lg:block space-y-4">
        <Card className="border-l-[6px]" style={{ borderLeftColor: classColor }}>
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
                  // Navigate logic
                }}
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Main Feed */}
      <div className="flex flex-col gap-4 w-full">
        {/* Create Announcement Input */}
        <Card className="shadow-sm overflow-hidden border-border/60 border-l-[6px]" style={{ borderLeftColor: classColor }}>
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
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                userId={userId}
                classColor={classColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
