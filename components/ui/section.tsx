import * as React from "react"

import { cn } from "@/lib/utils"
import { layout, typographyVariants } from "@/lib/design-system"

type PageContainerProps = React.ComponentProps<"div"> & {
  /**
   * Content width. `content` suits most app pages, `wide` suits dense tables,
   * and `full` lets a collection run edge to edge inside the shell gutter.
   */
  width?: keyof Pick<typeof layout, "narrow" | "content" | "wide" | "canvas" | "full">
}

/**
 * Constrains and paces a page. Every route body should start with one of these
 * so content width and vertical rhythm never drift between features.
 */
function PageContainer({ className, width = "content", ...props }: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn(layout[width], layout.pageSections, className)}
      {...props}
    />
  )
}

type PageHeadingProps = {
  /** Small uppercase context label above the title. */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary actions, right-aligned on desktop and stacked on mobile. */
  actions?: React.ReactNode
  /** Optional leading visual, e.g. an organization avatar. */
  media?: React.ReactNode
  className?: string
  /** Heading level for the title. Defaults to `h1`. */
  as?: "h1" | "h2"
}

/**
 * Page title block. Keeps the eyebrow / title / description / action rhythm
 * identical across routes, which is most of what makes a product feel coherent.
 */
function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  media,
  className,
  as: Tag = "h1",
}: PageHeadingProps) {
  return (
    <div
      data-slot="page-heading"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="flex min-w-0 items-start gap-4">
        {media}
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? (
            <p className={typographyVariants({ variant: "overline", tone: "muted" })}>{eyebrow}</p>
          ) : null}
          <Tag className={typographyVariants({ variant: Tag === "h1" ? "h1" : "h2" })}>{title}</Tag>
          {description ? (
            <p className={cn(typographyVariants({ variant: "body", tone: "muted" }), "max-w-2xl")}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
      ) : null}
    </div>
  )
}

type SectionHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** Header for a section inside a page. One step down from `PageHeading`. */
function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-wrap items-end justify-between gap-3", className)}
    >
      <div className="min-w-0 space-y-1">
        <h2 className={typographyVariants({ variant: "h2" })}>{title}</h2>
        {description ? (
          <p className={typographyVariants({ variant: "small", tone: "muted" })}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { PageContainer, PageHeading, SectionHeader }
