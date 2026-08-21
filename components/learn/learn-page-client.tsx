"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Plus, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { createStudySpace } from "@/app/actions/learn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody } from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"

type Space = { id: string; title: string; description: string | null; cardCount: number; quizCount: number; sourceCount: number; updatedAt: Date }

/** Client-only marker for a study space that exists only in this list. */
type OptimisticSpace = Space & { tempId: string; pending?: boolean }

export function LearnPageClient({ orgSlug, spaces }: { orgSlug: string; spaces: Space[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [optimisticSpaces, setOptimisticSpaces] = useState<OptimisticSpace[]>([])
  const { mutate, pending } = useOptimisticMutation<OptimisticSpace[]>(optimisticSpaces, setOptimisticSpaces)

  const allSpaces = [...optimisticSpaces, ...spaces]

  function submit() {
    setError(null)
    const tempId = `space-${crypto.randomUUID()}`
    const optimisticSpace: OptimisticSpace = {
      id: tempId,
      tempId,
      pending: true,
      title,
      description: description || null,
      cardCount: 0,
      quizCount: 0,
      sourceCount: 0,
      updatedAt: new Date(),
    }

    void mutate(
      (previous) => [optimisticSpace, ...previous],
      () => createStudySpace({ orgSlug, title, description }),
      {
        onSuccess: (result, current) => {
          // The space page notFound()s unknown IDs, so navigate only once the
          // server has assigned a real collection ID.
          if (result.success) {
            router.push(`/${orgSlug}/learn/spaces/${result.collectionId}`)
            router.refresh()
          }
          return current.filter((item) => item.tempId !== tempId)
        },
        onError: (_message, current) => current.filter((item) => item.tempId !== tempId),
      },
    )

    // The optimistic card is already in the grid: close and reset immediately.
    setOpen(false)
    setTitle("")
    setDescription("")
  }

  return <PageContainer width="content" className="py-6 sm:py-8">
    <PageHeading eyebrow="Student workspace" title="Study spaces" description="Keep sources, flashcards, quizzes, and review progress together." actions={<Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Create</Button>} />
    {allSpaces.length === 0 ? <Panel padding="none"><PanelBody><EmptyState icon={<BookOpen />} tone="primary" title="No Study spaces yet" description="Create a private workspace for a subject, unit, or exam." action={<Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Create Study space</Button>} size="page" /></PanelBody></Panel> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{allSpaces.map((space) => <Link key={space.id} href={`/${orgSlug}/learn/spaces/${space.id}`} className="focus-ring rounded-lg"><Panel className="h-full transition-colors hover:bg-surface"><PanelBody className="flex h-full flex-col gap-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate type-h4">{space.title}</h2><p className="mt-1 line-clamp-2 type-small text-muted-foreground">{space.description || "A private study workspace"}</p></div>{"pending" in space && space.pending ? <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-hairline/70"><span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />Creating…</span> : <Sparkles className="shrink-0 text-primary" aria-hidden="true" />}</div><div className="mt-auto flex flex-wrap gap-3 type-caption text-muted-foreground"><span>{space.sourceCount} sources</span><span>{space.cardCount} cards</span><span>{space.quizCount} quizzes</span></div></PanelBody></Panel></Link>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create Study space</DialogTitle><DialogDescription>Start empty. Add cards, quizzes, and sources afterward.</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="space-title">Title</FieldLabel><Input id="space-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><Field><FieldLabel htmlFor="space-description" optional>Description</FieldLabel><Textarea id="space-description" value={description} onChange={(event) => setDescription(event.target.value)} /></Field></FieldGroup>{error ? <p className="type-small text-danger" role="alert">{error}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} isLoading={pending} disabled={pending || !title.trim()}>Create Study space</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>
}