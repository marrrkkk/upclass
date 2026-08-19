"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/typography"

export type GreetingCardProps = {
  userName: string
  role: "teacher" | "student" | null
  primaryAction?: {
    label: string
    href: string
    icon?: React.ReactNode
  }
}

function getGreetingData(): string {
  const hour = new Date().getHours()
  if (hour < 5) return "Good late night"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 21) return "Good evening"
  return "Good night"
}

function getOverviewDescription(role: "teacher" | "student" | null) {
  return role === "teacher"
    ? "Your teaching workspace is ready. Review work that needs feedback and keep your classes moving."
    : "Your learning workspace is ready. Continue your work and stay ahead of what is due next."
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

const defaultGreeting = "Welcome"
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function GreetingCard({ userName, role, primaryAction }: GreetingCardProps) {
  const hasHydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
  const firstName = userName?.split(" ")[0] || "there"
  const greeting = hasHydrated ? getGreetingData() : defaultGreeting

  return (
    <header
      data-slot="greeting"
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0 space-y-1.5">
        <Text variant="overline" tone="muted" as="span" className="font-medium">
          {hasHydrated ? formatToday() : "\u00A0"}
        </Text>
        <Text as="h1" variant="h1" className="text-balance">
          {greeting}, {firstName}
        </Text>
        <Text variant="small" tone="muted" className="max-w-2xl text-pretty leading-relaxed">
          {getOverviewDescription(role)}
        </Text>
      </div>

      <div className="flex w-full items-center justify-end sm:w-auto">
        <span className="sr-only">{role === "teacher" ? "Teaching" : "Learning"}</span>
        {primaryAction ? (
          <Button asChild size="default" className="shrink-0 px-4">
            <Link href={primaryAction.href}>
              {primaryAction.icon}
              {primaryAction.label}
              {!primaryAction.icon ? <ArrowRight aria-hidden="true" /> : null}
            </Link>
          </Button>
        ) : null}
      </div>
    </header>
  )
}

