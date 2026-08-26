"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, CalendarClock, Plus, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { createStudySpace } from "@/app/actions/learn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody } from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"

type Space = { id: string; title: string; description: string | null; cardCount: number; quizCount: number; sourceCount: number; updatedAt: Date }

type WeeklyPlan = {
  summary: string
  focusAreas: string[]
  days: Array<{ label: string; items: string[] }>
}

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

  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [planPending, setPlanPending] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  async function generatePlan() {
    setPlanError(null)
    setPlanPending(true)
    try {
      const response = await fetch("/api/ai/learn/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug }),
      })
      const data = (await response.json().catch(() => null)) as WeeklyPlan & { error?: string } | null
      if (!response.ok || !data || data.error) {
        setPlanError(data?.error ?? "The plan could not be generated.")
        return
      }
      setPlan(data)
    } catch {
      setPlanError("You appear to be offline.")
    } finally {
      setPlanPending(false)
    }
  }

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
    <WeeklyPlanCard plan={plan} pending={planPending} error={planError} onGenerate={() => void generatePlan()} hasSpaces={allSpaces.length > 0} />
    {allSpaces.length === 0 ? <Panel padding="none"><PanelBody><EmptyState icon={<BookOpen />} tone="primary" title="No Study spaces yet" description="Create a private workspace for a subject, unit, or exam." action={<Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Create Study space</Button>} size="page" /></PanelBody></Panel> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{allSpaces.map((space) => <Link key={space.id} href={`/${orgSlug}/learn/spaces/${space.id}`} className="focus-ring rounded-lg"><Panel className="h-full transition-colors hover:bg-surface"><PanelBody className="flex h-full flex-col gap-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate type-h4">{space.title}</h2><p className="mt-1 line-clamp-2 type-small text-muted-foreground">{space.description || "A private study workspace"}</p></div>{"pending" in space && space.pending ? <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-hairline/70"><span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />Creating…</span> : <Sparkles className="shrink-0 text-primary" aria-hidden="true" />}</div><div className="mt-auto flex flex-wrap gap-3 type-caption text-muted-foreground"><span>{space.sourceCount} sources</span><span>{space.cardCount} cards</span><span>{space.quizCount} quizzes</span></div></PanelBody></Panel></Link>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create Study space</DialogTitle><DialogDescription>Start empty. Add cards, quizzes, and sources afterward.</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="space-title">Title</FieldLabel><Input id="space-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><Field><FieldLabel htmlFor="space-description" optional>Description</FieldLabel><Textarea id="space-description" value={description} onChange={(event) => setDescription(event.target.value)} /></Field></FieldGroup>{error ? <p className="type-small text-danger" role="alert">{error}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} isLoading={pending} disabled={pending || !title.trim()}>Create Study space</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>
}

function WeeklyPlanCard({
  plan,
  pending,
  error,
  onGenerate,
  hasSpaces,
}: {
  plan: WeeklyPlan | null
  pending: boolean
  error: string | null
  onGenerate: () => void
  hasSpaces: boolean
}) {
  return (
    <Panel padding="none" className="mb-4">
      <PanelBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Weekly study plan</h2>
              <p className="type-caption text-muted-foreground">
                {plan ? plan.summary : "AI turns your due cards, review accuracy, and deadlines into a 7-day plan."}
              </p>
            </div>
          </div>
          <Button size="sm" variant={plan ? "outline" : "default"} onClick={onGenerate} disabled={pending}>
            {pending ? <Spinner className="size-4" aria-hidden="true" /> : <Sparkles data-icon="inline-start" />}
            {plan ? "Refresh plan" : "Generate my week"}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>
        ) : null}

        {plan ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-hairline bg-surface-subtle/40 p-3 md:col-span-2 xl:col-span-1">
              <p className="type-overline uppercase text-muted-foreground">Focus areas</p>
              <ul className="mt-2 space-y-1.5">
                {(plan.focusAreas.length > 0 ? plan.focusAreas : ["Build your first study space"]).map((area) => (
                  <li key={area} className="type-small font-medium">{area}</li>
                ))}
              </ul>
            </div>
            {plan.days.map((day) => (
              <div key={day.label} className="rounded-xl border border-hairline p-3">
                <p className="type-overline uppercase text-muted-foreground">{day.label}</p>
                <ul className="mt-2 space-y-1.5">
                  {day.items.map((item, index) => (
                    <li key={index} className="type-small">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : !hasSpaces && !pending ? (
          <p className="mt-3 type-caption text-muted-foreground">
            Create a study space first — plans get smarter once there is something to review.
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  )
}