"use client"

/**
 * Daily Class Pulse card: a snapshot of classroom signals with an on-demand
 * AI daily briefing. Facts are aggregated server-side (no PII leaves the
 * server); the briefing is generated only when the teacher/student asks.
 */
import { useState } from "react"
import Link from "next/link"
import { Activity, CalendarClock, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Text } from "@/components/ui/typography"
import type { PulseFacts } from "@/lib/ai/pulse/facts"

type PulseCardProps = {
  orgSlug: string
  facts: PulseFacts | null
}

function formatDue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "soon"
  const diff = date.getTime() - Date.now()
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (days <= 0) return "today"
  if (days === 1) return "tomorrow"
  return `in ${days} days`
}

export function PulseCard({ orgSlug, facts }: PulseCardProps) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "generating" | "done" | "error">("idle")

  const generate = async () => {
    if (state === "generating") return
    setState("generating")
    try {
      const response = await fetch(`/api/ai/pulse/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug }),
      })
      const data = (await response.json()) as { briefing?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? "Could not generate the briefing")
      setBriefing(data.briefing ?? "")
      setState("done")
    } catch (error) {
      setState("error")
      console.error("[pulse] briefing failed:", error)
    }
  }

  const hasFacts = !!facts && (facts.facts.length > 0 || !!facts.nearestDeadline)

  return (
    <Panel padding="none" variant="panel" data-slot="pulse-card">
      <PanelHeader>
        <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-info-surface text-info-strong">
            <Activity className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <PanelTitle>Daily Class Pulse</PanelTitle>
            <PanelDescription>Your classroom at a glance</PanelDescription>
          </div>
        </PanelHeading>
      </PanelHeader>

      <PanelBody className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {!hasFacts ? (
          <Text variant="caption" tone="subtle">
            Nothing needs attention right now — enjoy the quiet day.
          </Text>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {facts?.facts.map((fact) => (
                <li
                  key={fact.id}
                  className="rounded-[var(--radius-container)] border border-hairline bg-surface-subtle px-2.5 py-2 sm:px-3 sm:py-2.5"
                >
                  <span className="block type-caption font-medium text-foreground">
                    {fact.value} {fact.label}
                  </span>
                  {fact.detail ? (
                    <span className="block truncate type-caption text-muted-foreground">{fact.detail}</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {facts?.nearestDeadline ? (
              <Link
                href={`/${orgSlug}/classes/${facts.nearestDeadline.classId}`}
                className="touch-target focus-ring flex items-center gap-2 rounded-lg bg-primary-surface px-3 py-2 text-left text-primary-strong transition-colors hover:bg-primary-surface/70"
              >
                <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-small font-medium">
                    {facts.nearestDeadline.title}
                  </span>
                  <span className="block truncate type-caption text-primary-strong/80">
                    Due {formatDue(facts.nearestDeadline.dueDate)} · {facts.nearestDeadline.className}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            ) : null}
          </>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={generate}
            disabled={state === "generating" || !hasFacts}
          >
            {state === "generating" ? (
              <>
                <Spinner className="size-3.5" aria-hidden="true" /> Writing your briefing…
              </>
            ) : (
              <>
                <Activity className="size-3.5" aria-hidden="true" /> Generate daily briefing
              </>
            )}
          </Button>

          {briefing ? (
            <div className="space-y-1.5 rounded-lg border border-hairline bg-card p-3">
              <Text as="p" variant="small" tone="primary" className="font-medium">
                Today&apos;s briefing
              </Text>
              <Text as="p" variant="small" tone="muted">
                {briefing}
              </Text>
            </div>
          ) : null}

          {state === "error" ? (
            <Text variant="caption" tone="danger">
              Could not generate the briefing — try again in a moment.
            </Text>
          ) : null}
        </div>
      </PanelBody>
    </Panel>
  )
}