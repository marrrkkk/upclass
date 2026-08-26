"use client"

/**
 * Study-space Sources ingestion: paste notes (ready immediately) or link an
 * accessible org resource, which is extracted + marked ready/failed by the
 * server action following the pending -> processing -> ready -> failed
 * status machine.
 */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileText, NotebookPen } from "lucide-react"

import {
  addStudySourceFromResource,
  addStudySourceNotes,
  listLinkableResources,
} from "@/app/actions/learn"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type LinkableResource = { id: string; title: string; fileName: string; fileType: string; hasText: boolean }

export function AddStudySourceDialog({
  orgSlug,
  collectionId,
  open,
  onOpenChange,
}: {
  orgSlug: string
  collectionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"notes" | "link">("notes")
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [resources, setResources] = useState<LinkableResource[] | null>(null)
  const [selectedResource, setSelectedResource] = useState<string>("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || resources) return
    let cancelled = false
    void listLinkableResources(orgSlug)
      .then((rows) => {
        if (cancelled) return
        setResources(rows)
        setSelectedResource(rows[0]?.id ?? "")
      })
      .catch(() => {
        if (!cancelled) setResources([])
      })
    return () => {
      cancelled = true
    }
  }, [open, orgSlug, resources])

  function reset() {
    setTitle("")
    setText("")
    setError(null)
    setPending(false)
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function submit() {
    setError(null)
    if (mode === "notes") {
      if (!title.trim()) {
        setError("Give the source a title.")
        return
      }
      if (text.trim().length < 20) {
        setError("Paste at least a couple of sentences.")
        return
      }
    } else if (!selectedResource) {
      setError("Choose a resource to link.")
      return
    }

    setPending(true)
    try {
      const result =
        mode === "notes"
          ? await addStudySourceNotes({ orgSlug, collectionId, title: title.trim(), text: text.trim() })
          : await addStudySourceFromResource({ orgSlug, collectionId, resourceId: selectedResource })
      if (!result.success) {
        // A failed extraction still created a failed row so the student can
        // see why; surface it but keep the dialog open for another attempt.
        setError(result.error)
        if (!("sourceId" in result)) return
        reset()
        onOpenChange(false)
        router.refresh()
        return
      }
      reset()
      onOpenChange(false)
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Ready sources ground AI generation with citations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "notes" ? "default" : "outline"} onClick={() => setMode("notes")}>
              <NotebookPen data-icon="inline-start" />
              Paste notes
            </Button>
            <Button type="button" variant={mode === "link" ? "default" : "outline"} onClick={() => setMode("link")}>
              <FileText data-icon="inline-start" />
              Link resource
            </Button>
          </div>

          {mode === "notes" ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="source-title">Title</FieldLabel>
                <Input id="source-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Week 3 lecture notes" />
              </Field>
              <Field>
                <FieldLabel htmlFor="source-text">Notes</FieldLabel>
                <Textarea id="source-text" value={text} onChange={(event) => setText(event.target.value)} rows={6} placeholder="Paste the material you want to study…" />
              </Field>
            </FieldGroup>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-hairline bg-surface-subtle/40 p-2" role="radiogroup" aria-label="Organization resources">
              {resources === null ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="size-4" aria-hidden="true" />
                </div>
              ) : resources.length === 0 ? (
                <p className="px-1 py-3 text-center text-sm text-muted-foreground">
                  No resources available. Ask a teacher to upload materials, or{" "}
                  <Link href={`/${orgSlug}/resources`} className="underline underline-offset-2">browse the library</Link>.
                </p>
              ) : (
                resources.map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedResource === resource.id}
                    onClick={() => setSelectedResource(resource.id)}
                    className={cn(
                      "focus-ring block w-full rounded-md px-2.5 py-1.5 text-left",
                      selectedResource === resource.id ? "bg-primary-surface ring-1 ring-primary-border" : "hover:bg-surface-hover",
                    )}
                  >
                    <span className="block truncate text-sm font-medium">{resource.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {resource.fileName}
                      {resource.hasText ? " · processed" : " · needs processing"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={pending} disabled={pending}>
            {mode === "link" ? "Link & process" : "Add source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
