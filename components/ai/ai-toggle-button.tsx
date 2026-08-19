"use client"

/**
 * Header toggle for the assistant side panel (Ctrl+J). Visible at all
 * breakpoints; `aria-controls` points at the panel aside.
 */
import { Sparkles } from "lucide-react"

import { useAiPanel } from "@/components/ai/ai-panel-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AiToggleButton() {
  const { open, toggle } = useAiPanel()

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Ask AI"
            aria-expanded={open}
            aria-controls="assistant-panel"
            className="text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Ask AI (Ctrl+J)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}