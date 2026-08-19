"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit, MoreVertical, SmilePlus, Trash2 } from "lucide-react"

import { deleteAnnouncement, toggleReaction, updateAnnouncement } from "@/app/actions/class-detail"
import { AnnouncementSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
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
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AnnouncementData } from "@/types/classes"

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
      <div className="group overflow-hidden rounded-2xl border border-hairline/80 bg-card p-5 shadow-e1 transition-all hover:border-hairline hover:shadow-e2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <EntityAvatar
              name={announcement.author.name}
              image={announcement.author.image}
              colorKey={announcement.author.id}
              size="md"
            />
            <div className="min-w-0">
              <Text variant="h4" truncate className="font-semibold">{announcement.author.name}</Text>
              <Text variant="caption" tone="muted">
                {formatAnnouncementDate(announcement.createdAt)}
              </Text>
            </div>
          </div>

          {canEdit || canDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Announcement actions"
                  className="rounded-lg text-muted-foreground opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                >
                  <MoreVertical className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {canEdit ? (
                  <DropdownMenuItem onClick={() => { setEditContent(announcement.content); setEditOpen(true) }}>
                    <Edit className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    {canEdit ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="py-3.5">
          <Text className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-foreground">{announcement.content}</Text>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={optimisticReactionState.hasReacted ? "secondary" : "ghost"}
                size="sm"
                disabled={!userId}
                className={cn("h-8 rounded-lg text-xs", optimisticReactionState.hasReacted && "text-primary-strong font-semibold")}
                title="Add reaction"
              >
                {optimisticReactionState.hasReacted && optimisticReactionState.userReaction ? (
                  <span aria-hidden="true">
                    {REACTION_EMOJIS[optimisticReactionState.userReaction]?.emoji || "👍"}
                  </span>
                ) : (
                  <SmilePlus className="size-3.5" aria-hidden="true" />
                )}
                {optimisticReactionState.hasReacted && optimisticReactionState.userReaction
                  ? REACTION_EMOJIS[optimisticReactionState.userReaction]?.label || "Liked"
                  : "Reaction"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex min-w-0 gap-1 p-1 rounded-xl">
              {Object.entries(REACTION_EMOJIS).map(([key, { emoji, label }]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleReaction(key)}
                  className={cn(
                    "focus-ring flex size-9 cursor-pointer items-center justify-center rounded-lg p-0 text-base",
                    optimisticReactionState.userReaction === key && "bg-primary-surface",
                  )}
                  title={label}
                  aria-label={label}
                >
                  {emoji}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {optimisticReactionState.count > 0 ? (
            <div
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              title={`${optimisticReactionState.count} reaction${optimisticReactionState.count !== 1 ? "s" : ""}`}
            >
              <span className="flex -space-x-1" aria-hidden="true">
                {sortedReactions.map(([type]) => (
                  <span key={type} className="text-xs leading-none">
                    {REACTION_EMOJIS[type]?.emoji || "👍"}
                  </span>
                ))}
              </span>
              <span className="font-semibold text-foreground/80 numeric-tabular">
                {optimisticReactionState.count}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[34rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBadge tone="primary" size="sm"><Edit /></IconBadge>
              Edit announcement
            </DialogTitle>
            <DialogDescription>Update the message shared with this class.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            placeholder="Announcement content"
            className="min-h-44 resize-none"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEdit} disabled={editPending || !editContent.trim()}>
              {editPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBadge tone="danger" size="sm"><Trash2 /></IconBadge>
              Delete announcement
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <Callout tone="danger" icon={false}>
            <Text variant="small">
              Are you sure you want to delete &ldquo;{announcement.content.length > 100 ? `${announcement.content.slice(0, 100)}...` : announcement.content}&rdquo;?
            </Text>
          </Callout>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deletePending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deletePending}>
              <Trash2 aria-hidden="true" />
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
