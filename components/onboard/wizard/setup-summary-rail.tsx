"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import {
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"

export type SetupSummaryItem = {
  label: string
  value?: string | null
  status?: "complete" | "pending" | "skipped"
}

type SetupSummaryRailProps = {
  title?: string
  items: SetupSummaryItem[]
  className?: string
  collapsibleOnMobile?: boolean
}

function statusTone(status: SetupSummaryItem["status"]) {
  if (status === "complete") return "success" as const
  if (status === "skipped") return "warning" as const
  return "neutral" as const
}

function statusLabel(status: SetupSummaryItem["status"]) {
  if (status === "complete") return "Done"
  if (status === "skipped") return "Skipped"
  return "Pending"
}

export function SetupSummaryRail({
  title = "Setup summary",
  items,
  className,
  collapsibleOnMobile = true,
}: SetupSummaryRailProps) {
  const [open, setOpen] = React.useState(false)

  const content = (
    <PanelBody className="space-y-4 p-5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Text variant="caption" tone="muted">
              {item.label}
            </Text>
            {item.status ? (
              <StatusBadge tone={statusTone(item.status)} size="sm">
                {statusLabel(item.status)}
              </StatusBadge>
            ) : null}
          </div>
          <Text variant="small" className="font-medium text-pretty">
            {item.value?.trim() || "Not set yet"}
          </Text>
        </div>
      ))}
    </PanelBody>
  )

  if (!collapsibleOnMobile) {
    return (
      <aside className={cn("hidden lg:block", className)}>
        <Panel padding="none" className="sticky top-24 overflow-hidden border border-hairline bg-card shadow-e1">
          <PanelHeader className="border-b border-hairline">
            <PanelHeading>
              <PanelTitle>{title}</PanelTitle>
              <PanelDescription>Your progress so far.</PanelDescription>
            </PanelHeading>
          </PanelHeader>
          {content}
        </Panel>
      </aside>
    )
  }

  return (
    <>
      <aside className={cn("hidden lg:block", className)}>
        <Panel padding="none" className="sticky top-24 overflow-hidden border border-hairline bg-card shadow-e1">
          <PanelHeader className="border-b border-hairline">
            <PanelHeading>
              <PanelTitle>{title}</PanelTitle>
              <PanelDescription>Your progress so far.</PanelDescription>
            </PanelHeading>
          </PanelHeader>
          {content}
        </Panel>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring flex w-full items-center justify-between rounded-xl border border-hairline bg-card px-4 py-3 text-left shadow-e1"
          aria-expanded={open}
        >
          <Text variant="small" className="font-semibold">
            {title}
          </Text>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {open ? (
          <Panel padding="none" className="mt-2 overflow-hidden border border-hairline bg-card shadow-e1">
            {content}
          </Panel>
        ) : null}
      </div>
    </>
  )
}
