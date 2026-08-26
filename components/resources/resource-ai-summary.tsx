"use client"

/**
 * Cached AI outline for files the browser cannot preview (ppt/doc/xls).
 * Renders a scannable summary card in place of "Preview unavailable" so
 * every resource is readable at a glance; failures degrade quietly.
 */
import { useEffect, useState } from "react"
import { Bot, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Panel, PanelBody } from "@/components/ui/panel"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"

type SummaryPayload = {
  headline: string
  bullets: string[]
  keyTerms: string[]
  modelId?: string
}

export function ResourceAiSummary({
  resourceId,
  onAsk,
}: {
  resourceId: string
  onAsk: () => void
}) {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading")

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    void fetch(`/api/ai/resources/summary?resourceId=${encodeURIComponent(resourceId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status))
        return (await response.json()) as SummaryPayload
      })
      .then((data) => {
        if (cancelled || !data.headline) throw new Error("empty")
        setSummary(data)
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("hidden")
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [resourceId])

  if (state === "hidden") {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center p-6 sm:min-h-[20rem]">
        <EmptyPreviewFallback />
      </div>
    )
  }

  if (state === "loading" || !summary) {
    return (
      <div className="space-y-4 p-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Generating an AI outline of this document…
        </p>
      </div>
    )
  }

  return (
    <Panel padding="none" className="border-0 bg-transparent shadow-none">
      <PanelBody className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge tone="primary" dot>
            AI outline
          </StatusBadge>
          <Button type="button" size="sm" variant="ghost" onClick={onAsk}>
            <Bot data-icon="inline-start" />
            Ask about this document
          </Button>
        </div>
        <h3 className="mt-2 text-base font-semibold">{summary.headline}</h3>
        <ul className="mt-3 space-y-2">
          {summary.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
              <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        {summary.keyTerms.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {summary.keyTerms.map((term) => (
              <span key={term} className="rounded-md bg-surface-subtle/80 px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-hairline/70">
                {term}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-[11px] text-muted-foreground">
          AI-generated from this file&apos;s contents — verify important details.
        </p>
      </PanelBody>
    </Panel>
  )
}

function EmptyPreviewFallback() {
  return (
    <p className="max-w-sm text-center text-sm text-muted-foreground">
      This file format cannot be previewed directly in the browser.
    </p>
  )
}
