"use client"

import { MessageSquare, Plus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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
  classColor,
  error,
  open,
  pending,
  userRole,
  onClose,
  onOpen,
  onSubmit,
}: AnnouncementComposerProps) {
  return (
    <>
      <Card className="shadow-sm overflow-hidden border-border/60 border-l-[6px]" style={{ borderLeftColor: classColor }}>
        {userRole === "teacher" ? (
          <div
            className="p-4 cursor-pointer transition-colors hover:bg-muted/30"
            onClick={onOpen}
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

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-y-auto gap-0 border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 border-b border-border/50 shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pb-4">
            <form id="announcement-form" action={onSubmit} className="space-y-4">
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
                onClick={onClose}
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
    </>
  )
}
