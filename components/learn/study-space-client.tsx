"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, FileText, Layers3, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { createStudyQuiz, deleteStudyCard, deleteStudySource, saveStudyCard } from "@/app/actions/learn"
import { AddStudySourceDialog } from "@/components/learn/add-study-source-dialog"
import { GenerateStudyDialog, type ReadySource } from "@/components/learn/generate-study-dialog"
import { useAiPanel } from "@/components/ai/ai-panel-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"

type Card = { id: string; front: string; back: string; hint: string | null; explanation: string | null; dueAt: Date }
type Question = { id: string; prompt: string; options: string[]; correctAnswer: string; explanation: string | null }
type Quiz = { id: string; title: string; description: string | null; questions: Question[] }
type Source = { id: string; title: string; status: "pending" | "processing" | "ready" | "failed"; errorMessage: string | null; resourceId?: string | null }
type Data = { collection: { id: string; title: string; description: string | null }; cards: Card[]; quizzes: Quiz[]; sources: Source[]; sessions: Array<{ id: string; correct: number; total: number; mode: string; createdAt: Date }> }

/** Client-only markers for entities that exist only in this local list. */
type CardItem = Card & { tempId?: string; pending?: boolean }
type QuizItem = Quiz & { tempId?: string; pending?: boolean }

const SOURCE_STATUS_TONE = {
  pending: "neutral",
  processing: "warning",
  ready: "success",
  failed: "danger",
} as const

export function StudySpaceClient({ orgSlug, data }: { orgSlug: string; data: Data }) {
  const router = useRouter()
  const { openFor } = useAiPanel()
  const [cardOpen, setCardOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateMode, setGenerateMode] = useState<"flashcards" | "practice_quiz">("flashcards")
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)
  const [front, setFront] = useState(""); const [back, setBack] = useState(""); const [hint, setHint] = useState(""); const [explanation, setExplanation] = useState(""); const [quizTitle, setQuizTitle] = useState("")

  const [cards, setCards] = useState<CardItem[]>(data.cards)
  useEffect(() => {
    setCards(data.cards)
  }, [data.cards])
  const { mutate: mutateCards, pending: cardPending } = useOptimisticMutation<CardItem[]>(cards, setCards)

  const [quizzes, setQuizzes] = useState<QuizItem[]>(data.quizzes)
  useEffect(() => {
    setQuizzes(data.quizzes)
  }, [data.quizzes])
  const { mutate: mutateQuizzes, pending: quizPending } = useOptimisticMutation<QuizItem[]>(quizzes, setQuizzes)

  function openCard(card?: Card) { setEditing(card ?? null); setFront(card?.front ?? ""); setBack(card?.back ?? ""); setHint(card?.hint ?? ""); setExplanation(card?.explanation ?? ""); setCardOpen(true) }

  const readySources: ReadySource[] = useMemo(
    () =>
      data.sources
        .filter((source) => source.status === "ready")
        .map((source) => ({ id: source.id, title: source.title, kind: source.resourceId ? ("resource" as const) : ("notes" as const) })),
    [data.sources],
  )

  function openGenerate(mode: "flashcards" | "practice_quiz") {
    if (readySources.length === 0) {
      setAddSourceOpen(true)
      return
    }
    setGenerateMode(mode)
    setGenerateOpen(true)
  }

  async function removeSource(sourceId: string) {
    await deleteStudySource({ orgSlug, collectionId: data.collection.id, sourceId })
    router.refresh()
  }

  function saveCard() {
    const editingId = editing?.id ?? null
    const tempId: string = editingId ?? `card-${crypto.randomUUID()}`
    const optimisticCard: CardItem = { id: tempId, tempId, pending: true, front, back, hint: hint || null, explanation: explanation || null, dueAt: editing?.dueAt ?? new Date() }

    void mutateCards(
      editingId
        ? (previous) => previous.map((card) => (card.id === editingId ? optimisticCard : card))
        : (previous) => [optimisticCard, ...previous],
      () => saveStudyCard({ orgSlug, collectionId: data.collection.id, cardId: editingId ?? undefined, front, back, hint, explanation }),
      {
        onSuccess: (result, current) => {
          if (result.success) {
            setCardOpen(false)
            router.refresh()
            return current.map((card) =>
              card.tempId === tempId
                ? { ...card, id: result.cardId, tempId: result.cardId, pending: false }
                : card,
            )
          }
          return current
        },
      },
    )
  }

  function removeCard(cardId: string) {
    void mutateCards(
      (previous) => previous.filter((card) => card.id !== cardId),
      () => deleteStudyCard({ orgSlug, collectionId: data.collection.id, cardId }),
      {
        onSuccess: (_result, current) => {
          router.refresh()
          return current
        },
      },
    )
  }

  function saveQuiz() {
    const tempId = `quiz-${crypto.randomUUID()}`
    const optimisticQuiz: QuizItem = { id: tempId, tempId, pending: true, title: quizTitle, description: null, questions: [] }

    void mutateQuizzes(
      (previous) => [optimisticQuiz, ...previous],
      () => createStudyQuiz({ orgSlug, collectionId: data.collection.id, title: quizTitle }),
      {
        onSuccess: (result, current) => {
          if (result.success) {
            setQuizOpen(false)
            setQuizTitle("")
            router.refresh()
            return current.map((quiz) =>
              quiz.tempId === tempId
                ? { ...quiz, id: result.quizId, tempId: result.quizId, pending: false }
                : quiz,
            )
          }
          return current
        },
      },
    )
  }

  return <PageContainer width="content" className="py-6 sm:py-8">
    <PageHeading eyebrow="Study space" title={data.collection.title} description={data.collection.description || `${cards.length} cards · ${quizzes.length} quizzes · ${data.sources.length} sources`} actions={<div className="flex gap-2"><Button variant="outline" asChild><Link href={`/${orgSlug}/learn`}><ArrowLeft data-icon="inline-start" />Study spaces</Link></Button><Button onClick={() => openFor({ surface: "study", entityId: data.collection.id, label: data.collection.title })}><Bot data-icon="inline-start" />Ask AI</Button></div>} />
    <Tabs defaultValue="overview" variant="line"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="cards">Flashcards</TabsTrigger><TabsTrigger value="quizzes">Practice quizzes</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList>
      <TabsContent value="overview"><div className="grid gap-3 md:grid-cols-3"><Panel><PanelBody><p className="type-overline text-muted-foreground">Flashcards</p><p className="mt-2 type-h2">{cards.length}</p></PanelBody></Panel><Panel><PanelBody><p className="type-overline text-muted-foreground">Quizzes</p><p className="mt-2 type-h2">{quizzes.length}</p></PanelBody></Panel><Panel><PanelBody><p className="type-overline text-muted-foreground">Recent reviews</p><p className="mt-2 type-h2">{data.sessions.length}</p></PanelBody></Panel></div></TabsContent>
      <TabsContent value="cards"><Panel padding="none"><PanelHeader><PanelHeading><PanelTitle>Flashcards</PanelTitle></PanelHeading><div className="flex gap-2"><Button variant="outline" asChild><Link href={`/${orgSlug}/learn/spaces/${data.collection.id}/review`}>Review</Link></Button><Button variant="outline" onClick={() => openGenerate("flashcards")}><Sparkles data-icon="inline-start" />Generate with AI</Button><Button onClick={() => openCard()}><Plus data-icon="inline-start" />Add flashcard</Button></div></PanelHeader><PanelBody>{cards.length ? <div className="divide-y divide-hairline">{cards.map((card) => <div key={card.id} className="flex items-start gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-medium">{card.front}</p><p className="mt-1 type-small text-muted-foreground">{card.back}</p></div>{card.pending ? <span className="inline-flex items-center gap-1.5 self-center rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-hairline/70"><span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />Saving…</span> : null}<Button variant="ghost" size="icon" onClick={() => openCard(card)} title="Edit flashcard"><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => removeCard(card.id)} title="Delete flashcard"><Trash2 /></Button></div>)}</div> : <EmptyState icon={<Layers3 />} title="No flashcards" description="Add cards manually, or generate a grounded draft with AI from your sources." action={<Button onClick={() => openGenerate("flashcards")}><Sparkles data-icon="inline-start" />Generate with AI</Button>} />}</PanelBody></Panel></TabsContent>
      <TabsContent value="quizzes"><Panel padding="none"><PanelHeader><PanelHeading><PanelTitle>Practice quizzes</PanelTitle></PanelHeading><div className="flex gap-2"><Button variant="outline" onClick={() => openGenerate("practice_quiz")}><Sparkles data-icon="inline-start" />Generate with AI</Button><Button onClick={() => setQuizOpen(true)}><Plus data-icon="inline-start" />Create quiz</Button></div></PanelHeader><PanelBody>{quizzes.length ? <div className="divide-y divide-hairline">{quizzes.map((quiz) => <div key={quiz.id} className="py-4"><p className="font-medium">{quiz.title}</p><p className="type-small text-muted-foreground">{quiz.questions.length} questions</p></div>)}</div> : <EmptyState title="No quizzes" description="Create one manually, or let AI draft a practice quiz from your sources." action={<Button variant="outline" onClick={() => openGenerate("practice_quiz")}><Sparkles data-icon="inline-start" />Generate with AI</Button>} />}</PanelBody></Panel></TabsContent>
      <TabsContent value="sources"><Panel padding="none"><PanelHeader><PanelHeading><PanelTitle>Sources</PanelTitle></PanelHeading><Button variant="outline" onClick={() => setAddSourceOpen(true)}><Plus data-icon="inline-start" />Add source</Button></PanelHeader><PanelBody>{data.sources.length ? <div className="divide-y divide-hairline">{data.sources.map((source) => <div key={source.id} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate font-medium">{source.title}</p>{source.errorMessage ? <p className="mt-0.5 type-caption text-danger">{source.errorMessage}</p> : null}</div><div className="flex shrink-0 items-center gap-2"><StatusBadge tone={SOURCE_STATUS_TONE[source.status]} dot>{source.status === "ready" ? "Ready" : source.status === "processing" ? "Processing" : source.status === "failed" ? "Failed" : "Pending"}</StatusBadge>{source.status !== "processing" && source.status !== "pending" ? <Button variant="ghost" size="icon-xs" onClick={() => void removeSource(source.id)} title="Remove source"><X /></Button> : null}</div></div>)}</div> : <EmptyState icon={<FileText />} tone="primary" title="No sources yet" description="Paste notes or link an org resource — processed sources ground AI generation with citations." action={<Button onClick={() => setAddSourceOpen(true)}><Plus data-icon="inline-start" />Add source</Button>} />}</PanelBody></Panel></TabsContent>
    </Tabs>
    <Dialog open={cardOpen} onOpenChange={setCardOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit flashcard" : "Add flashcard"}</DialogTitle><DialogDescription>Cards do not require a source.</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="card-front">Front</FieldLabel><Textarea id="card-front" value={front} onChange={(e) => setFront(e.target.value)} /></Field><Field><FieldLabel htmlFor="card-back">Back</FieldLabel><Textarea id="card-back" value={back} onChange={(e) => setBack(e.target.value)} /></Field><Field><FieldLabel htmlFor="card-hint" optional>Hint</FieldLabel><Input id="card-hint" value={hint} onChange={(e) => setHint(e.target.value)} /></Field><Field><FieldLabel htmlFor="card-explanation" optional>Explanation</FieldLabel><Textarea id="card-explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} /></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setCardOpen(false)}>Cancel</Button><Button onClick={saveCard} isLoading={cardPending} disabled={cardPending || !front.trim() || !back.trim()}>Save card</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={quizOpen} onOpenChange={setQuizOpen}><DialogContent><DialogHeader><DialogTitle>Create quiz</DialogTitle><DialogDescription>Start a persistent multiple-choice practice quiz.</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="quiz-title">Title</FieldLabel><Input id="quiz-title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} /></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => setQuizOpen(false)}>Cancel</Button><Button onClick={saveQuiz} isLoading={quizPending} disabled={quizPending || !quizTitle.trim()}>Create quiz</Button></DialogFooter></DialogContent></Dialog>
    <GenerateStudyDialog orgSlug={orgSlug} collectionId={data.collection.id} readySources={readySources} defaultMode={generateMode} open={generateOpen} onOpenChange={setGenerateOpen} />
    <AddStudySourceDialog orgSlug={orgSlug} collectionId={data.collection.id} open={addSourceOpen} onOpenChange={setAddSourceOpen} />
  </PageContainer>
}