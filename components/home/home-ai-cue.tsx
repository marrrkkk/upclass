"use client"

import { useCallback, useMemo } from "react"
import { Sparkles, ArrowRight } from "lucide-react"

import { useAiPanel, type AiPanelSeed } from "@/components/ai/ai-panel-provider"
import {
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import type { ActionQueueItem, StudentActionQueueItem, TeacherActionQueueItem } from "./home-action-queue"

type HomeAiCueProps = {
  queueItems: ActionQueueItem[]
  role: "teacher" | "student" | null
  totalClasses: number
  embedded?: boolean
}

type SuggestionPrompt = {
  id: string
  prompt: string
  label: string
  seed?: AiPanelSeed
}

export function HomeAiCue({ queueItems, role, totalClasses, embedded = false }: HomeAiCueProps) {
  const { openFor, setOpen } = useAiPanel()

  const suggestions = useMemo<SuggestionPrompt[]>(() => {
    const list: SuggestionPrompt[] = []

    if (role === "teacher") {
      const submissions = queueItems.filter(
        (it): it is TeacherActionQueueItem & { kind: "submission" } => it.kind === "submission",
      )
      const unreadQuestions = queueItems.find(
        (it): it is TeacherActionQueueItem & { kind: "question" } => it.kind === "question",
      )

      if (submissions.length > 0) {
        const first = submissions[0]
        list.push({
          id: `grade-${first.submissionId}`,
          label: `Draft feedback for ${first.studentName}`,
          prompt: `Draft constructive feedback for ${first.studentName}'s submission on "${first.title}" in ${first.className}.`,
          seed: {
            surface: "class",
            entityId: first.classId,
            label: first.className,
          },
        })
      }

      if (unreadQuestions && unreadQuestions.count > 0) {
        list.push({
          id: "answer-questions",
          label: "Help answer pending student questions",
          prompt: `I have ${unreadQuestions.count} student questions pending. Can you help draft clear and encouraging replies?`,
        })
      }

      if (list.length < 2) {
        list.push({
          id: "lesson-plan",
          label: "Generate review questions for next class",
          prompt: "Suggest 3 quick formative assessment questions I can use to check understanding in my next class.",
        })
      }
    } else {
      // Student suggestions
      const studentItems = queueItems as StudentActionQueueItem[]
      const unsubmitted = studentItems.filter((it) => !it.isSubmitted)
      const overdue: StudentActionQueueItem[] = []
      const upcoming: StudentActionQueueItem[] = []

      for (const item of unsubmitted) {
        const dueTime = new Date(item.dueDate).getTime()
        if (!Number.isNaN(dueTime)) {
          // If past or upcoming
          if (dueTime < Date.parse(new Date().toISOString())) {
            overdue.push(item)
          } else {
            upcoming.push(item)
          }
        }
      }

      if (overdue.length > 0) {
        list.push({
          id: "summarize-overdue",
          label: "Break down my overdue assignments",
          prompt: `Help me create a quick recovery plan to complete my ${overdue.length} overdue assignment${
            overdue.length === 1 ? "" : "s"
          }, starting with "${overdue[0].title}".`,
          seed: {
            surface: "class",
            entityId: overdue[0].classId,
            label: overdue[0].className,
          },
        })
      } else if (upcoming.length > 0) {
        const next = upcoming[0]
        list.push({
          id: `prepare-${next.id}`,
          label: `Plan work for "${next.title}"`,
          prompt: `Give me a 3-step study outline to tackle "${next.title}" in ${next.className}.`,
          seed: {
            surface: "class",
            entityId: next.classId,
            label: next.className,
          },
        })
      }

      if (list.length < 2) {
        list.push({
          id: "study-schedule",
          label: "Make a weekly study plan",
          prompt: `Help me structure a focused study schedule for this week across my ${
            totalClasses || "current"
          } classes.`,
        })
      }
    }

    return list.slice(0, 3)
  }, [queueItems, role, totalClasses])

  const handleSelectPrompt = useCallback(
    (item: SuggestionPrompt) => {
      if (item.seed) {
        openFor(item.seed)
      } else {
        setOpen(true)
      }
    },
    [openFor, setOpen],
  )

  const content = (
    <>
      <PanelHeader>
        <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-info-surface text-info-strong">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <PanelTitle>AI Assistant Cue</PanelTitle>
            <PanelDescription>Contextual suggestions based on your pending work.</PanelDescription>
          </div>
        </PanelHeading>
      </PanelHeader>

      <PanelBody className="flex flex-1 flex-col justify-between p-3.5 space-y-3">
        <ul className="space-y-2">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelectPrompt(item)}
                className="group focus-ring flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-left text-xs transition-colors hover:border-hairline-strong hover:bg-muted/70"
              >
                <span className="line-clamp-2 font-medium text-foreground group-hover:text-primary-strong">
                  {item.label}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </button>
            </li>
          ))}
        </ul>

        <Text variant="caption" tone="subtle" className="text-center">
          Launches the persistent assistant in the sidebar (or press <kbd className="font-mono text-[10px]">Ctrl+J</kbd>)
        </Text>
      </PanelBody>
    </>
  )

  return embedded ? (
    <div data-slot="home-ai-cue" className="border-t border-primary-border bg-primary-surface px-5 py-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Text variant="h4" tone="primary">Plan what comes next</Text>
            <Text variant="caption" tone="primary">Suggested from your current work</Text>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelectPrompt(item)}
                  className="group focus-ring inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-left type-caption font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] sm:w-auto"
                >
                  <span className="line-clamp-1">{item.label}</span>
                  <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  ) : (
    <Panel padding="none" variant="panel" className="flex h-full flex-col overflow-hidden">
      {content}
    </Panel>
  )
}
