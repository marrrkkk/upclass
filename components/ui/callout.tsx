import * as React from "react"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { calloutVariants, type Tone } from "@/lib/design-system"

const toneIcon: Record<Tone, React.ElementType> = {
  neutral: Info,
  primary: Sparkles,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  danger: OctagonAlert,
}

type CalloutProps = React.ComponentProps<"div"> & {
  tone?: Tone
  /** Pass `false` to drop the leading icon, or a node to override it. */
  icon?: React.ReactNode | false
  /** Trailing action, e.g. a dismiss or retry button. */
  action?: React.ReactNode
}

/**
 * Inline feedback for form results, permissions notes and empty-ish warnings.
 *
 * Announced politely by default; pass `role="alert"` for errors that need to
 * interrupt. Use this instead of hand-rolled tinted `div`s so every message in
 * the product carries the same semantics and colour treatment.
 */
function Callout({ className, tone = "neutral", icon, action, children, ...props }: CalloutProps) {
  const Icon = toneIcon[tone]

  return (
    <div
      data-slot="callout"
      role={props.role ?? "status"}
      className={cn(calloutVariants({ tone }), className)}
      {...props}
    >
      {icon === false ? null : icon ? icon : <Icon aria-hidden="true" />}
      <div className="min-w-0 flex-1 [&_p]:leading-relaxed">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export { Callout }
