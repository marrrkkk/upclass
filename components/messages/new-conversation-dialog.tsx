"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Mail, MessageSquarePlus, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { userKeys } from "@/hooks/query-keys"
import { cn } from "@/lib/utils"

type NewConversationDialogProps = {
  currentUserId: string
  triggerVariant?: "compact" | "default" | "icon"
  className?: string
  label?: string
}

export function NewConversationDialog({
  currentUserId,
  triggerVariant = "default",
  className,
  label = "New conversation",
}: NewConversationDialogProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userQuery = useQuery({
    queryKey: userKeys.byEmail(submittedEmail ?? ""),
    queryFn: async ({ queryKey }) => {
      const response = await fetch(
        `/api/users/by-email?email=${encodeURIComponent(queryKey[2])}`,
      )
      if (!response.ok) {
        throw new Error("User not found with this email address")
      }
      return response.json() as Promise<{ userId: string }>
    },
    enabled: submittedEmail !== null,
    retry: false,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })

  useEffect(() => {
    if (!userQuery.isSuccess || !userQuery.data) return

    if (userQuery.data.userId === currentUserId) {
      setError("You cannot start a conversation with yourself")
      setSubmittedEmail(null)
      return
    }

    setOpen(false)
    setEmail("")
    setSubmittedEmail(null)
    router.push(organizationPath(`/messages/${userQuery.data.userId}`))
  }, [currentUserId, organizationPath, router, userQuery.data, userQuery.isSuccess])

  useEffect(() => {
    if (userQuery.isError) {
      setError(userQuery.error.message)
      setSubmittedEmail(null)
    }
  }, [userQuery.error, userQuery.isError])

  const handleSearch = () => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError("Please enter an email address")
      return
    }

    setError(null)
    setSubmittedEmail(trimmedEmail)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSubmittedEmail(null)
          setError(null)
          setEmail("")
        }
      }}
    >
      <DialogTrigger asChild>
        {triggerVariant === "compact" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 rounded-lg border-hairline/80 bg-surface/60 px-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-surface hover:text-primary gap-1",
              className,
            )}
          >
            <Plus className="size-3.5 text-primary" />
            <span>New</span>
          </Button>
        ) : triggerVariant === "icon" ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="New conversation"
            className={cn("size-8 rounded-lg shadow-2xs", className)}
          >
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className={cn("h-9 rounded-lg px-3.5 gap-1.5 text-xs font-semibold shadow-2xs", className)}
          >
            <Plus className="size-3.5" />
            <span>{label}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border-hairline/80 shadow-e3 sm:max-w-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquarePlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">Start a conversation</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Find a classmate or teacher by their registered email address.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="minimal-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto py-2">
          {/* Direct Message Section */}
          <section aria-labelledby="direct-message-heading" className="space-y-2.5">
            <div className="flex items-center gap-1.5 px-0.5">
              <Mail className="size-3.5 text-muted-foreground" />
              <span id="direct-message-heading" className="text-xs font-bold uppercase text-muted-foreground">
                Direct message
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Find a classmate or teacher by their registered email address.
            </p>
            
            <div className="space-y-2 pt-1">
              <Label htmlFor="message-email" className="text-xs font-medium">
                Email address
              </Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="message-email"
                  type="email"
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError(null)
                    setSubmittedEmail(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleSearch()
                    }
                  }}
                  className="h-10 rounded-lg border-hairline/90 bg-surface/70 pl-9 pr-3 text-sm focus-visible:bg-card shadow-2xs"
                  disabled={userQuery.isFetching}
                />
              </div>
            </div>

            {error ? (
              <Callout tone="danger" role="alert" className="mt-2 text-xs">
                {error}
              </Callout>
            ) : null}
          </section>
        </div>

        <DialogFooter className="gap-2 border-t border-hairline/70 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setEmail("")
              setSubmittedEmail(null)
              setError(null)
            }}
            className="h-10 rounded-lg px-4 font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={userQuery.isFetching || !email.trim()}
            isLoading={userQuery.isFetching}
            className="h-10 rounded-lg px-4 font-semibold shadow-2xs"
          >
            {userQuery.isFetching ? "Searching…" : "Start chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
