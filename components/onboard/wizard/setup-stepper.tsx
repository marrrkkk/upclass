"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Text } from "@/components/ui/typography"

export type SetupStep = {
  id: string
  label: string
}

type SetupStepperProps = {
  steps: SetupStep[]
  currentStepId: string
  completedStepIds?: string[]
  className?: string
}

export function SetupStepper({
  steps,
  currentStepId,
  completedStepIds = [],
  className,
}: SetupStepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId)
  const progressValue =
    steps.length <= 1 ? 100 : Math.round(((currentIndex + 1) / steps.length) * 100)

  return (
    <nav aria-label="Setup progress" className={cn("space-y-3", className)}>
      <div className="hidden items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const isComplete = completedStepIds.includes(step.id)
          const isCurrent = step.id === currentStepId
          return (
            <React.Fragment key={step.id}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isComplete
                      ? "border-primary bg-primary text-primary-text"
                      : isCurrent
                        ? "border-primary bg-primary-surface text-primary-strong"
                        : "border-hairline bg-surface text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <Text
                  as="span"
                  variant="small"
                  className={cn(
                    "truncate font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </Text>
              </div>
              {index < steps.length - 1 ? (
                <span className="h-px min-w-6 flex-1 bg-hairline" aria-hidden="true" />
              ) : null}
            </React.Fragment>
          )
        })}
      </div>

      <div className="sm:hidden">
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
          <Text variant="small" className="shrink-0 font-medium">
            Step {Math.max(currentIndex + 1, 1)} of {steps.length}
          </Text>
          <Text variant="caption" tone="muted" className="min-w-0 truncate">
            {steps[currentIndex]?.label}
          </Text>
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>
    </nav>
  )
}
