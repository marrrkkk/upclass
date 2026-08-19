"use client"

import * as React from "react"
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Tone } from "@/lib/design-system"

type ToastTone = Extract<Tone, "success" | "warning" | "info" | "danger" | "primary">

type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
}

type ToastItem = ToastInput & { id: number; tone: ToastTone }

type ToastContextValue = {
  show: (input: ToastInput) => number
  success: (title: string, description?: string) => number
  error: (title: string, description?: string) => number
  info: (title: string, description?: string) => number
  warning: (title: string, description?: string) => number
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const toneClasses: Record<ToastTone, string> = {
  primary: "border-primary-border bg-primary-surface text-primary-text",
  success: "border-success-border bg-success-surface text-success-text",
  warning: "border-warning-border bg-warning-surface text-warning-text",
  info: "border-info-border bg-info-surface text-info-text",
  danger: "border-destructive-border bg-destructive-surface text-destructive-text",
}

const toneIcons = {
  primary: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
  danger: XCircle,
} satisfies Record<ToastTone, React.ElementType>

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(0)
  const timers = React.useRef(new Map<number, number>())

  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = React.useCallback((input: ToastInput) => {
    const id = ++nextId.current
    const item: ToastItem = { ...input, id, tone: input.tone ?? "info" }
    setItems((current) => [...current.slice(-3), item])
    timers.current.set(id, window.setTimeout(() => dismiss(id), input.duration ?? 5000))
    return id
  }, [dismiss])

  React.useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const value = React.useMemo<ToastContextValue>(() => ({
    show,
    dismiss,
    success: (title, description) => show({ title, description, tone: "success" }),
    error: (title, description) => show({ title, description, tone: "danger" }),
    info: (title, description) => show({ title, description, tone: "info" }),
    warning: (title, description) => show({ title, description, tone: "warning" }),
  }), [dismiss, show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[80] mx-auto flex w-auto max-w-sm flex-col gap-2 sm:right-5 sm:left-auto sm:bottom-5"
      >
        {items.map((item) => {
          const Icon = toneIcons[item.tone]
          return (
            <div
              key={item.id}
              data-slot="toast"
              data-tone={item.tone}
              role="status"
              className={cn("pointer-events-auto flex items-start gap-3 rounded-[var(--radius-container)] border p-3 shadow-e2 animate-scale-in", toneClasses[item.tone])}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="type-small font-semibold">{item.title}</p>
                {item.description ? <p className="mt-0.5 type-caption opacity-85">{item.description}</p> : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-mr-1 -mt-1 shrink-0 text-current hover:bg-current/10"
                aria-label={`Dismiss ${item.title}`}
                onClick={() => dismiss(item.id)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}
