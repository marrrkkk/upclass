"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit, MoreVertical, SmilePlus, Trash2 } from "lucide-react"

import { deleteAnnouncement, toggleReaction, updateAnnouncement } from "@/app/actions/class-detail"
import { AnnouncementSkeleton } from "@/components/skeletons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { AnnouncementData } from "@/components/classes/types"

const REACTION_EMOJIS: Record<string, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😂", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😡", label: "Angry" },
}

function formatAnnouncementDate(dateString: string) {
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

export function AnnouncementCard({
  announcement,
  userId,
  userRole,
  classColor,
}: {
  announcement: AnnouncementData
  userId?: string
  userRole: "teacher" | "student" | null
  classColor: string
}) {
  const router = useRouter()
  const reactionState = useMemo(() => {
    const userReaction = userId
      ? announcement.reactions.find((reaction) => reaction.userId === userId)?.reaction ?? null
      : null

    return {
      count: announcement.reactions.length,
      hasReacted: !!userReaction,
      userReaction,
    }
  }, [announcement.reactions, userId])
  const [optimisticReactionState, setOptimisticReactionState] = useOptimistic(
    reactionState,
    (currentState, reactionType: string) => {
      const isTogglingOff = currentState.userReaction === reactionType
      let nextCount = currentState.count

      if (!currentState.hasReacted) nextCount += 1
      else if (isTogglingOff) nextCount -= 1

      return {
        count: Math.max(0, nextCount),
        hasReacted: !isTogglingOff,
        userReaction: isTogglingOff ? null : reactionType,
      }
    },
  )
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editContent, setEditContent] = useState(announcement.content)
  const [editPending, startEditTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  const isAuthor = userId === announcement.author.id
  const canEdit = isAuthor
  const canDelete = isAuthor || userRole === "teacher"
  const authorInitial = announcement.author.name.charAt(0).toUpperCase()

  const handleReaction = async (reactionType: string) => {
    if (!userId) return

    setOptimisticReactionState(reactionType)

    try {
      await toggleReaction(announcement.id, reactionType)
    } catch (error) {
      console.error("Failed to toggle reaction", error)
    }
  }

  const handleEdit = () => {
    startEditTransition(async () => {
      const result = await updateAnnouncement(announcement.id, editContent)
      if (result.success) {
        setEditOpen(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    setDeleteOpen(false)
    startDeleteTransition(async () => {
      const result = await deleteAnnouncement(announcement.id)
      if (result.success) {
        router.refresh()
      } else {
        console.error("Failed to delete")
      }
    })
  }

  if (deletePending) {
    return <AnnouncementSkeleton />
  }

  const reactionCounts: Record<string, number> = {}
  announcement.reactions.forEach((reaction) => {
    reactionCounts[reaction.reaction] = (reactionCounts[reaction.reaction] || 0) + 1
  })
  const sortedReactions = Object.entries(reactionCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)

  return (
    <>
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
                <p className="text-xs text-muted-foreground mt-1">{formatAnnouncementDate(announcement.createdAt)}</p>
              </div>
            </div>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-full text-muted-foreground focus:outline-none">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => { setEditContent(announcement.content); setEditOpen(true) }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      {canEdit && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                    optimisticReactionState.hasReacted
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  title="Add reaction"
                >
                  {optimisticReactionState.hasReacted && optimisticReactionState.userReaction ? (
                    <>
                      <span className="text-base leading-none">{REACTION_EMOJIS[optimisticReactionState.userReaction]?.emoji || "👍"}</span>
                      <span className="capitalize">{REACTION_EMOJIS[optimisticReactionState.userReaction]?.label || "Liked"}</span>
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
                      optimisticReactionState.userReaction === key && "bg-blue-50 ring-1 ring-blue-200",
                    )}
                    title={label}
                  >
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {optimisticReactionState.count > 0 && (
              <div
                className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full cursor-default"
                title={`${optimisticReactionState.count} reaction${optimisticReactionState.count !== 1 ? "s" : ""}`}
              >
                <div className="flex -space-x-1">
                  {sortedReactions.map(([type]) => (
                    <span key={type} className="text-sm leading-none">
                      {REACTION_EMOJIS[type]?.emoji || "👍"}
                    </span>
                  ))}
                </div>
                <span className="font-medium">{optimisticReactionState.count}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 border-b border-border/50">
            <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Edit className="h-5 w-5" />
              </div>
              Edit Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pb-4">
            <Textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              placeholder="Announcement content..."
              className="min-h-[180px] resize-none"
            />
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={editPending || !editContent.trim()}
              className={cn(buttonVariants(), "min-w-[100px] shadow-md hover:shadow-lg transition-all")}
              style={{ backgroundColor: classColor }}
            >
              {editPending ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Delete Announcement</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this announcement?
            </p>
            <p className="text-sm text-foreground/80 line-clamp-2 italic">
              &ldquo;{announcement.content.length > 100 ? `${announcement.content.slice(0, 100)}...` : announcement.content}&rdquo;
            </p>
          </div>

          <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deletePending}
              className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}
            >
              {deletePending ? "Deleting..." : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
