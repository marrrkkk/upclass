"use client"

import { useState, useTransition } from "react"
import { Upload } from "lucide-react"

import { publishClassResource } from "@/app/actions/org-resources"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type PublishResourceButtonProps = {
  orgId: string
  classId: string
  resourceId: string
  isPublished: boolean
}

export function PublishResourceButton({
  orgId,
  classId,
  resourceId,
  isPublished,
}: PublishResourceButtonProps) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(isPublished)

  function handlePublish() {
    setError(null)

    startTransition(async () => {
      const result = await publishClassResource(orgId, classId, resourceId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setPublished(true)
      setOpen(false)
    })
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={published || pending}
            aria-label={
              published
                ? "Already published to organization library"
                : "Publish to organization library"
            }
          >
            <Upload className="mr-2 size-4" />
            {published ? "Already Published" : "Publish to Org Library"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to Organization Library</AlertDialogTitle>
            <AlertDialogDescription>
              This will make a copy of this resource available to all members of
              your organization. The original class resource will remain
              unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={pending}>
              {pending ? "Publishing..." : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
