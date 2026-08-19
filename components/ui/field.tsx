import * as React from "react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Label } from "@/components/ui/label"

/**
 * Form field primitives.
 *
 * Stripe-style structure: a label row that can carry a right-aligned hint, the
 * control, then help or error text. Spacing and focus behaviour live here so no
 * two forms in the product drift apart.
 *
 * ```tsx
 * <Field>
 *   <FieldLabel htmlFor="name" hint="Required">Organization name</FieldLabel>
 *   <Input id="name" />
 *   <FieldHelp>Shown to everyone you invite.</FieldHelp>
 * </Field>
 * ```
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("space-y-2", className)} {...props} />
}

/** Vertical stack of fields with consistent spacing. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("space-y-5", className)} {...props} />
}

/** Side-by-side fields that stack on mobile. */
function FieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-row"
      className={cn("grid gap-4 sm:grid-cols-2", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  children,
  hint,
  optional,
  ...props
}: React.ComponentProps<typeof Label> & {
  /** Right-aligned meta text, e.g. a character count or format hint. */
  hint?: React.ReactNode
  /** Marks the field as optional instead of adding a required asterisk. */
  optional?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Label data-slot="field-label" className={cn("text-[13px]", className)} {...props}>
        {children}
        {optional ? (
          <span className={typographyVariants({ variant: "caption", tone: "subtle" })}>Optional</span>
        ) : null}
      </Label>
      {hint ? (
        <span className={typographyVariants({ variant: "caption", tone: "subtle" })}>{hint}</span>
      ) : null}
    </div>
  )
}

function FieldHelp({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-help"
      className={cn(typographyVariants({ variant: "caption", tone: "muted" }), className)}
      {...props}
    />
  )
}

function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null

  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn(typographyVariants({ variant: "caption", tone: "danger" }), className)}
      {...props}
    >
      {children}
    </p>
  )
}

/**
 * Wraps an `Input` with a static prefix and/or suffix (URL stems, currency,
 * units). The group owns the border and focus ring; the inner input is
 * transparent so the whole control lights up as one element.
 */
function InputAffix({
  className,
  prefix,
  suffix,
  invalid,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "prefix"> & {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  invalid?: boolean
}) {
  return (
    <div
      data-slot="input-affix"
      data-invalid={invalid ? "true" : undefined}
      className={cn(
        "border-input flex h-9 w-full items-center overflow-hidden rounded-md border bg-transparent transition-all duration-200 ease-out",
        "focus-within:border-primary focus-within:ring-primary/20 focus-within:shadow-e1 focus-within:ring-[3px]",
        "data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20",
        className,
      )}
      {...props}
    >
      {prefix ? (
        <span className="flex h-full shrink-0 select-none items-center gap-1.5 border-r border-hairline bg-muted/40 pr-2.5 pl-3 text-[13px] text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      {children}
      {suffix ? (
        <span className="flex h-full shrink-0 select-none items-center border-l border-hairline bg-muted/40 pr-3 pl-2.5 text-[13px] text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

/** Class list for an `Input` nested inside `InputAffix`. */
const affixInputClassName =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-none"

export {
  Field,
  FieldGroup,
  FieldRow,
  FieldLabel,
  FieldHelp,
  FieldError,
  InputAffix,
  affixInputClassName,
}
