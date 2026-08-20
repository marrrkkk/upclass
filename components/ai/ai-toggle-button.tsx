"use client"

/**
 * Header toggle for the assistant side panel (Ctrl+J). Visible at all
 * breakpoints; `aria-controls` points at the panel aside.
 */
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
            variant="default"
            size="sm"
            onClick={toggle}
            aria-label="Ask AI"
            aria-expanded={open}
            aria-controls="assistant-panel"
            className="ai-toggle-button min-h-9 px-3 font-semibold shadow-e1 transition-[box-shadow,transform,background-color] hover:-translate-y-px hover:shadow-e2"
          >
            Ask AI
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Ask AI (Ctrl+J)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
