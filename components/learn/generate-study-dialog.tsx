"use client"

/**
 * "Generate with AI" flow for a study space: pick a grounded source
 * (ready sources or pasted notes), configure the run, preview the draft,
 * then persist cards or a practice quiz via the learn server actions.
 */
import { useState } from "react"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import { saveGeneratedCards, saveGeneratedQuiz } from "@/app/actions/learn"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type ReadySource = { id: string; title: string; kind: "resource" | "notes" }

type GeneratedCard = { front: string; back: string; hint?: string; explanation?: string; sourceRefs?: string[] }
type GeneratedQuestion = { prompt: string; options: string[]; correctAnswer: string; explanation?: string; sourceRefs?: string[] }

const DIFFICULTIES = [
  { value: "foundational", label: "Foundational" },
  { value: "standard", label: "Standard" },
  { value: "challenging", label: "Challenging" },
] as const

export function GenerateStudyDialog({
  orgSlug,
  collectionId,
  readySources,
  defaultMode = "flashcards",
  open,
  onOpenChange,
}: {
  orgSlug: string
  collectionId: string
  readySources: ReadySource[]
  defaultMode?: "flashcards" | "practice_quiz"
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"flashcards" | "practice_quiz">(defaultMode)
  const [sourceKind, setSourceKind] = useState<"ready" | "notes">(readySources.length > 0 ? "ready" : "notes")
  const [selectedSource, setSelectedSource] = useState<string>(readySources[0]?.id ?? "")
  const [notes, setNotes] = useState("")
  const [topic, setTopic] = useState("")
  const [instructions, setInstructions] = useState("")
  const [itemCount, setItemCount] = useState(8)
  const [difficulty, setDifficulty] = useState<string>("standard")

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cards, setCards] = useState<GeneratedCard[] | null>(null)
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null)

  function reset() {
    setCards(null)
    setQuestions(null)
    setError(null)
    setGenerating(false)
    setSaving(false)
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function generate() {
    setError(null)
    if (sourceKind === "ready") {
      if (!selectedSource) {
        setError("Choose a source first.")
        return
      }
    } else if (notes.trim().length < 20) {
      setError("Paste at least a couple of sentences to generate from.")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/ai/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          mode,
          topic: topic.trim() || undefined,
          instructions: instructions.trim() || undefined,
          itemCount,
          difficulty,
          source:
            sourceKind === "ready"
              ? { type: "study_source", sourceId: selectedSource }
              : { type: "notes", text: notes.trim() },
        }),
      })
      const data = (await response.json().catch(() => null)) as
        | { cards?: GeneratedCard[]; questions?: GeneratedQuestion[]; error?: string }
        | null
      if (!response.ok || !data) {
        setError(data?.error ?? "Generation failed. Try again in a moment.")
        return
      }
      if ((data.cards ?? []).length === 0 && (data.questions ?? []).length === 0) {
        setError("Nothing could be generated from this source yet. Add more material or a different topic.")
        return
      }
      setCards(data.cards ?? null)
      setQuestions(data.questions ?? null)
    } catch {
      setError("You appear to be offline. Generation needs a connection.")
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const result =
        mode === "flashcards" && cards
          ? await saveGeneratedCards({
              orgSlug,
              collectionId,
              cards: cards.map((card) => ({
                front: card.front,
                back: card.back,
                hint: card.hint,
                explanation: card.explanation,
                sourceRefs: card.sourceRefs ?? [],
              })),
            })
          : questions
            ? await saveGeneratedQuiz({ orgSlug, collectionId, title: topic.trim() || "Practice quiz", questions })
            : null
      if (!result || !result.success) {
        setError(result && "error" in result ? result.error : "Saving failed.")
        return
      }
      reset()
      onOpenChange(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const hasDraft = mode === "flashcards" ? Boolean(cards?.length) : Boolean(questions?.length)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            Drafts are grounded in your sources with citations — review before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          {!hasDraft ? (
            <>
              <FieldGroup className="gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={mode === "flashcards" ? "default" : "outline"}
                    onClick={() => setMode("flashcards")}
                  >
                    Flashcards
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "practice_quiz" ? "default" : "outline"}
                    onClick={() => setMode("practice_quiz")}
                  >
                    Practice quiz
                  </Button>
                </div>

                <div className="rounded-lg border border-hairline bg-surface-subtle/40 p-3">
                  <div className="mb-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={sourceKind === "ready" ? "secondary" : "ghost"}
                      disabled={readySources.length === 0}
                      onClick={() => setSourceKind("ready")}
                    >
                      Sources ({readySources.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={sourceKind === "notes" ? "secondary" : "ghost"}
                      onClick={() => setSourceKind("notes")}
                    >
                      Paste notes
                    </Button>
                  </div>
                  {sourceKind === "ready" ? (
                    readySources.length > 0 ? (
                      <div className="max-h-36 space-y-1 overflow-y-auto" role="radiogroup" aria-label="Ready sources">
                        {readySources.map((source) => (
                          <button
                            key={source.id}
                            type="button"
                            role="radio"
                            aria-checked={selectedSource === source.id}
                            onClick={() => setSelectedSource(source.id)}
                            className={cn(
                              "focus-ring block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm",
                              selectedSource === source.id
                                ? "bg-primary-surface font-medium text-primary-text ring-1 ring-primary-border"
                                : "hover:bg-surface-hover",
                            )}
                          >
                            {source.title}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-1 py-2 text-sm text-muted-foreground">
                        No processed sources yet — paste notes or add sources in the Sources tab.
                      </p>
                    )
                  ) : (
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Paste lecture notes, a chapter summary, anything to study…"
                      rows={5}
                    />
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="generate-topic">Topic</FieldLabel>
                    <Input id="generate-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Optional focus" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="generate-count">Items</FieldLabel>
                    <Select value={String(itemCount)} onValueChange={(value) => setItemCount(Number(value))}>
                      <SelectTrigger id="generate-count"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[4, 6, 8, 10, 12, 16].map((count) => (
                          <SelectItem key={count} value={String(count)}>{count}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="generate-difficulty">Difficulty</FieldLabel>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="generate-difficulty"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="generate-instructions" optional>Instructions</FieldLabel>
                  <Input id="generate-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="e.g. focus on definitions from week 2" />
                </Field>
              </FieldGroup>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Review {mode === "flashcards" ? `${cards?.length} flashcards` : `${questions?.length} questions`}
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
                {mode === "flashcards"
                  ? cards?.map((card, index) => (
                      <div key={index} className="rounded-lg border border-hairline p-2.5">
                        <p className="text-sm font-medium">{card.front}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{card.back}</p>
                        {card.sourceRefs?.length ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">Cites {card.sourceRefs.join(", ")}</p>
                        ) : null}
                      </div>
                    ))
                  : questions?.map((question, index) => (
                      <div key={index} className="rounded-lg border border-hairline p-2.5">
                        <p className="text-sm font-medium">{question.prompt}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {question.options.join(" · ")}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-primary-text">Answer: {question.correctAnswer}</p>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          {hasDraft ? (
            <>
              <Button variant="outline" onClick={() => { setCards(null); setQuestions(null) }} disabled={saving}>
                Back
              </Button>
              <Button onClick={save} isLoading={saving} disabled={saving}>
                Save {mode === "flashcards" ? "cards" : "quiz"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={generating}>
                Cancel
              </Button>
              {generating ? (
                <Button disabled>
                  <Spinner className="size-4" aria-hidden="true" />
                  Generating…
                </Button>
              ) : (
                <Button onClick={generate}>
                  <Sparkles data-icon="inline-start" />
                  Generate draft
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
