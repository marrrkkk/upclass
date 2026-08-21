"use client"

/**
 * Injects an "Ask AI" entry into the page header slot on class detail pages.
 * Seeding the assistant panel with the class context (get-or-create the
 * default class conversation on demand).
 */
import { useEffect } from "react"
import { Sparkles } from "lucide-react"

import { useAiPanel } from "@/components/ai/ai-panel-provider"
import { Button } from "@/components/ui/button"
import { usePageHeaderStore } from "@/stores/page-header-store"

export function ClassAiEntry({
  classId,
  classTitle,
}: {
  classId: string
  classTitle: string
}) {
  const { openFor } = useAiPanel()
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)
  const setMobileRightSideContent = usePageHeaderStore(
    (state) => state.setMobileRightSideContent,
  )

  useEffect(() => {
    const openClassChat = () =>
      openFor({ surface: "class", entityId: classId, label: classTitle })
    setRightSideContent(
      <Button type="button" variant="ghost" size="sm" onClick={openClassChat}>
        <Sparkles className="size-4" aria-hidden="true" />
        <span className="hidden lg:inline">Ask AI</span>
      </Button>,
    )
    setMobileRightSideContent(
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openClassChat}
        aria-label={`Ask AI about ${classTitle}`}
      >
        <Sparkles className="size-4" aria-hidden="true" />
      </Button>,
    )
    return () => {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
  }, [classId, classTitle, openFor, setRightSideContent, setMobileRightSideContent])

  return null
}