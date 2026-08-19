"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type ResponsiveOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** Sticky action row. Stays visible while the body scrolls on both layouts. */
  footer?: React.ReactNode
  /** Sheet edge on mobile. Defaults to `bottom` (form/detail convention). */
  mobileSide?: "right" | "left" | "bottom"
  /** Extra classes for the centered desktop Dialog. */
  desktopClassName?: string
  /** Extra classes for the mobile Sheet. */
  mobileClassName?: string
  /** Hide the visible close control (e.g. full-screen editors). */
  hideCloseButton?: boolean
}

/**
 * Shared responsive overlay: shadcn Dialog on desktop, shadcn Sheet on
 * touch-sized screens. Both layouts share the same title, description,
 * scrollable body and sticky footer, and only one of the two ever mounts, so
 * two competing overlays never appear.
 *
 * SSR-safe: the server (and first client paint) always renders the desktop
 * Dialog; the Sheet only appears after `useIsMobile` resolves.
 *
 * Every instance must provide `title` (and ideally `description`) so both
 * Radix surfaces get an accessible heading. Forms inside `children` submit
 * unchanged — the overlay never wraps content in a form.
 */
function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  mobileSide = "bottom",
  desktopClassName,
  mobileClassName,
  hideCloseButton = false,
}: ResponsiveOverlayProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={mobileSide}
          showCloseButton={false}
          className={cn(
            "flex h-full w-full max-w-lg flex-col gap-0 overflow-hidden p-0",
            mobileSide === "bottom" && "max-h-[92dvh] rounded-t-[var(--radius-cards)]",
            mobileClassName,
          )}
        >
          <SheetHeader
            className={cn(
              "shrink-0 border-b border-hairline bg-card px-4 pb-3 pt-4",
              !hideCloseButton && "pr-12",
            )}
          >
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <div
            data-slot="responsive-overlay-body"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
          >
            {children}
          </div>
          {footer ? (
            <SheetFooter className="shrink-0 border-t border-hairline bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </SheetFooter>
          ) : null}
          {!hideCloseButton ? (
            <SheetCloseButton
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3"
            />
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={description ? undefined : undefined}
        showCloseButton={false}
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0",
          desktopClassName,
        )}
      >
        <DialogHeader
          className={cn(
            "shrink-0 border-b border-hairline px-5 pb-3 pt-5 text-left",
            !hideCloseButton && "pr-12",
          )}
        >
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div
          data-slot="responsive-overlay-body"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          {children}
        </div>
        {footer ? (
          <DialogFooter className="shrink-0 border-t border-hairline bg-card px-5 py-3.5">
            {footer}
          </DialogFooter>
        ) : null}
        {!hideCloseButton ? (
          <DialogCloseButton onClick={() => onOpenChange(false)} className="absolute right-4 top-4" />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DialogCloseButton({
  className,
  onClick,
}: {
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "focus-ring z-10 flex size-8 items-center justify-center rounded-md bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <XIcon className="size-4" aria-hidden="true" />
      <span className="sr-only">Close</span>
    </button>
  )
}

function SheetCloseButton({
  className,
  onClick,
}: {
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "focus-ring z-10 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <XIcon className="size-4" aria-hidden="true" />
      <span className="sr-only">Close</span>
    </button>
  )
}

export { ResponsiveOverlay, type ResponsiveOverlayProps }