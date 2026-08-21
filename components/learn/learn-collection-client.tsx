"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Check, RotateCcw, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { reviewStudyCard } from "@/app/actions/learn"
import { Button } from "@/components/ui/button"
import { Panel, PanelBody, PanelHeader, PanelHeading, PanelTitle, PanelDescription } from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"

type Props = { orgSlug: string; collection: { id: string; title: string; description: string | null }; cards: Array<{ id: string; front: string; back: string; hint: string | null; dueAt: Date; sourceRefs: string[] }> }

export function LearnCollectionClient({ orgSlug, collection, cards }: Props) {
  const due = useMemo(() => cards, [cards])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [quizMode, setQuizMode] = useState(false)
  const [answer, setAnswer] = useState("")
  const current = due[index]

  async function rate(rating: "again" | "hard" | "good" | "easy") {
    if (!current) return
    await reviewStudyCard({ orgSlug, cardId: current.id, rating })
    setRevealed(false)
    setAnswer("")
    if (index + 1 >= due.length) setDone(true)
    else setIndex((value) => value + 1)
  }

  return <PageContainer width="narrow" className="py-6 sm:py-8">
    <PageHeading eyebrow="Study collection" title={collection.title} description={collection.description || `${cards.length} cards · ${due.length} due today`} actions={<Button variant="outline" asChild><Link href={`/${orgSlug}/learn`}><ArrowLeft data-icon="inline-start" />Learn</Link></Button>} />
    {done || due.length === 0 ? <Panel padding="none"><PanelBody className="flex flex-col items-center gap-4 py-14 text-center"><Sparkles className="text-primary" /><h2 className="type-h2">You are caught up</h2><p className="type-small text-muted-foreground">Come back when more cards are due, or practice the full set again.</p><Button onClick={() => { setDone(false); setIndex(0) }}>Practice again</Button></PanelBody></Panel> : <Panel padding="none"><PanelHeader><PanelHeading><PanelTitle>{quizMode ? "Practice quiz" : "Review"} {index + 1} of {due.length}</PanelTitle><PanelDescription>{quizMode ? "Write what you remember, then check your answer." : "Think of the answer before revealing the back."}</PanelDescription></PanelHeading><Button variant="outline" size="sm" onClick={() => { setQuizMode((value) => !value); setRevealed(false); setAnswer("") }}>{quizMode ? "Flashcard mode" : "Quiz mode"}</Button></PanelHeader><PanelBody className="flex flex-col gap-6"><div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-surface px-6 py-10 text-center"><span className="type-overline text-primary">Prompt</span><span className="mt-3 max-w-xl type-h2">{current.front}</span></div>{quizMode && !revealed ? <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer" className="min-h-28 rounded-lg border border-hairline bg-card p-3 type-small" /> : null}{!revealed ? <Button onClick={() => setRevealed(true)}>{quizMode ? "Check answer" : "Reveal answer"}</Button> : <><div className="rounded-lg border border-hairline bg-card p-4"><p className="type-overline text-muted-foreground">Answer</p><p className="mt-2 type-body">{current.back}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" onClick={() => rate("again")}><X data-icon="inline-start" />Again</Button><Button variant="outline" onClick={() => rate("hard")}><RotateCcw data-icon="inline-start" />Hard</Button><Button variant="outline" onClick={() => rate("good")}><Check data-icon="inline-start" />Good</Button><Button onClick={() => rate("easy")}><Sparkles data-icon="inline-start" />Easy</Button></div></>}</PanelBody></Panel>}
  </PageContainer>
}
