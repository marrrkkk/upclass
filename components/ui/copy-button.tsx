"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CopyButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** Text placed on the clipboard. */
  value: string
  /** Accessible label describing what gets copied. */
  label: string
  /** Show the label next to the icon instead of icon-only. */
  showLabel?: boolean
  /** Copied-state label. */
  copiedLabel?: string
}

/**
 * Copy-to-clipboard control with a self-resetting confirmation state.
 *
 * The confirmation is visual (icon swap) and announced via a polite live region,
 * so keyboard and screen-reader users get the same feedback as everyone else.
 */
function CopyButton({
  value,
  label,
  showLabel = false,
  copiedLabel = "Copied",
  className,
  variant = "ghost",
  size = showLabel ? "sm" : "icon-sm",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard permission denied — leave the control in its resting state.
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        {...props}
      >
        {copied ? (
          <Check className="size-3.5 text-success-text" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {showLabel ? <span>{copied ? copiedLabel : "Copy"}</span> : null}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </>
  )
}

export { CopyButton }
