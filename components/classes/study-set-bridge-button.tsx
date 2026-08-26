"use client"

/**
 * Student-facing "Make study set" bridge: generates a private flashcard set
 * from classwork content and navigates to the new study space.
 */
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Layers3 } from "lucide-react"

import { createStudyCollectionFromClasswork } from "@/app/actions/learn"
import { organizationSlugFromPathname } from "@/lib/organization-path"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function StudySetBridgeButton({
  classworkId,
  classworkTitle,
}: {
  classworkId: string
  classworkTitle: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const orgSlug = organizationSlugFromPathname(pathname) ?? ""
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!orgSlug || pending) return
    setError(null)
    setPending(true)
    try {
      const result = await createStudyCollectionFromClasswork({ orgSlug, classworkId })
      if (!result.success) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.push(`/${orgSlug}/learn/spaces/${result.collectionId}`)
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Layers3 aria-hidden="true" />
        Make study set
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setError(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make a study set</DialogTitle>
            <DialogDescription>
              AI drafts flashcards from &quot;{classworkTitle}&quot; into your private study spaces.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={generate} isLoading={pending} disabled={pending}>
              Generate study set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
