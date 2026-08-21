/**
 * UpClass global design system — Classroom Focus (DESIGN.md)
 * ---------------------------------------------------------------------------
 * Typed counterpart to the theme layer in `app/globals.css`. Everything here
 * is framework-agnostic class composition: shared variants, layout rhythm and
 * motion constants that feature code reuses instead of re-deriving a look.
 *
 * Rules of thumb:
 * - Reach for these variants (or the primitives in `components/ui/*`) first.
 * - Never hardcode palette values (`sky-400`, `#0075de`) in feature code —
 *   use a semantic tone (`primary`, `success`, `warning`, `info`, `danger`).
 * - Content surfaces separate with hairlines, never shadows. Elevation is
 *   derived and restrained (`shadow-nav`, `shadow-mockup`, `shadow-e4` for
 *   overlays); semantic state always has a visible label or icon.
 */

import { cva, type VariantProps } from "class-variance-authority"

/* -------------------------------------------------------------------------- */
/*                                   Tones                                    */
/* -------------------------------------------------------------------------- */

export const TONES = ["neutral", "primary", "success", "warning", "info", "danger"] as const

/** Semantic colour intent shared by badges, icon badges, dots and callouts. */
export type Tone = (typeof TONES)[number]

/* -------------------------------------------------------------------------- */
/*                            Density & geometry                              */
/* -------------------------------------------------------------------------- */

export const DENSITIES = ["compact", "default", "comfortable"] as const
export type Density = (typeof DENSITIES)[number]

/** CSS-variable-backed control geometry shared by every interactive primitive. */
export const control = {
  height: {
    sm: "h-[var(--control-height-sm)]",
    md: "h-[var(--control-height-md)]",
    lg: "h-[var(--control-height-lg)]",
  },
  radius: "rounded-[var(--radius-control)]",
} as const

/** 4px spacing grid. Values intentionally map to CSS variables, not literals. */
export const spacing = {
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  8: "var(--space-8)",
  10: "var(--space-10)",
} as const

/* -------------------------------------------------------------------------- */
/*                        Responsive interaction rules                         */
/* -------------------------------------------------------------------------- */

/**
 * Shared responsive breakpoints. Content-driven, CSS-first: mobile is below
 * `md`, tablet is `md`–`lg`, desktop is `lg`+, wide desktop is `xl`. Use the
 * Tailwind classes (`md:`, `lg:`, `xl:`) for layout; use these strings only
 * with `useMediaQuery` when the rendered interaction primitive itself must
 * change (Dialog vs Sheet, master/detail swap).
 */
export const breakpoints = {
  /** Phones and small foldables. */
  mobile: "(max-width: 767px)",
  /** Tablets and large phones. */
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  /** Laptops and desktops. */
  desktop: "(min-width: 1024px)",
  /** Large desktop displays. */
  wide: "(min-width: 1280px)",
} as const

/**
 * Touch sizing. Interactive controls reach at least 44px on touch-sized
 * screens (mobile + tablet portrait), while desktop keeps compact density.
 * Apply `touch-target` to compact controls and rows that need a comfortable
 * hit area; the utility is a no-op at `md` and above.
 */
export const touch = {
  /** Mobile-only minimum target size utility. */
  target: "touch-target",
  /** Comfortable hit area for icon buttons in sticky/fixed regions. */
  iconButton: "touch-target",
} as const

/**
 * Mobile layout rhythm. Every route follows the same priority stack:
 * single column below `md`, multi-column grids above. These are the shared
 * gutters, gaps and page padding so pages never drift between features.
 */
export const responsive = {
  /** Authenticated page padding: mobile gutter, tablet gutter, desktop gutter. */
  pagePadding: "px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-6",
  /** Gap between top-level page sections. */
  sectionGap: "space-y-4 sm:space-y-5",
  /** Priority stack that becomes a desktop grid at `lg`. */
  stack: "flex flex-col gap-4 lg:grid lg:grid-cols-12",
} as const

/* -------------------------------------------------------------------------- */
/*                                   Motion                                   */
/* -------------------------------------------------------------------------- */

/**
 * Motion presets. Durations come from the `--duration-*` ramp
 * (fast 150ms / base 200ms / slow 260ms) and easings from the approved set
 * in `app/globals.css`. Interactions stay under 260ms so the UI feels
 * immediate; shimmer is the only intentionally looping one and only for
 * loading feedback. Movement uses transform/opacity — never width, height,
 * top/left, or large shadows. The global `prefers-reduced-motion` override
 * collapses every non-essential animation to near-instant.
 *
 * Prefer these presets (or the `motion-*` CSS utilities) over ad-hoc
 * `duration-* ease-out` utility classes.
 */
export const motion = {
  /** Colour/opacity swaps — hover, focus, active. */
  fast: "motion-interactive",
  /** Default interaction timing (colour, border, shadow, transform). */
  base: "transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-base)] ease-out-expo",
  /** Layout-affecting movement — lifts, reveals, expansion. */
  slow: "transition-[opacity,transform] duration-[var(--duration-slow)] ease-out-expo",
  /** Colour-only transition; cheaper than `transition-all`. */
  colors: "motion-interactive",
  /** Transform-only transition for icons and small movements. */
  transform: "motion-icon",
  /** Entrance for content that streams in (opacity + ≤8px rise). */
  enter: "motion-enter",
  /** Entrance for overlays and popovers (opacity + faint scale). */
  enterOverlay: "motion-overlay",
  /** Restrained shimmer for loading/skeleton states. */
  loading: "motion-shimmer",
  /** State-change feedback: opacity/colour only, never layout. */
  feedback: "motion-feedback",
  /** Card/row hover lift — pointer devices only. */
  lift: "motion-lift",
} as const

/**
 * Staggered entrance delay for lists. Keep the ceiling low so long lists never
 * feel like they are loading slowly.
 */
export function staggerDelay(index: number, step = 45, max = 320) {
  return { animationDelay: `${Math.min(index * step, max)}ms` }
}

/* -------------------------------------------------------------------------- */
/*                              Layout & rhythm                               */
/* -------------------------------------------------------------------------- */

/**
 * Shared container widths and spacing rhythm. Content lives on a 4px base grid;
 * these are the only widths and vertical gaps we use.
 */
export const layout = {
  /** Focused reading/forms column. */
  narrow: "mx-auto w-full max-w-[34rem]",
  /** Default app content column. */
  content: "mx-auto w-full max-w-[72rem]",
  /** Dense dashboards and tables. */
  wide: "mx-auto w-full max-w-[88rem]",
  /** Marketing / onboarding canvas. */
  canvas: "mx-auto w-full max-w-[96rem]",
  /**
   * Edge-to-edge collection surface. No clamp: the shell gutter is the only
   * side margin, so grids keep filling ultrawide displays.
   */
  full: "w-full",

  /** Gap between top-level page sections. */
  pageSections: "space-y-4 sm:space-y-5",
  /** Gap between blocks inside a section. */
  sectionBlocks: "space-y-3 sm:space-y-4",
  /** Gap between a label and its control. */
  field: "space-y-1.5",

  /** Horizontal padding matching the authenticated shell. */
  gutter: "px-4 sm:px-5",
} as const

/* -------------------------------------------------------------------------- */
/*                                 Typography                                 */
/* -------------------------------------------------------------------------- */

/**
 * The type scale. `variant` sets size/weight, `tone` sets colour, so
 * the two concerns never get tangled in ad-hoc class strings.
 */
export const typographyVariants = cva("", {
  variants: {
    variant: {
      display: "type-display",
      h1: "type-h1",
      h2: "type-h2",
      h3: "type-h3",
      h4: "type-h4",
      bodyLg: "type-body-lg",
      read: "type-read",
      body: "type-body",
      small: "type-small",
      caption: "type-caption",
      overline: "type-overline",
      mono: "type-mono",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
      primary: "text-primary-text",
      success: "text-success-text",
      warning: "text-warning-text",
      info: "text-info-text",
      danger: "text-destructive-text",
      inverse: "text-primary-foreground",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
    truncate: false,
  },
})

export type TypographyVariantProps = VariantProps<typeof typographyVariants>

/* -------------------------------------------------------------------------- */
/*                                  Surfaces                                  */
/* -------------------------------------------------------------------------- */

/**
 * Container surfaces. `panel` is the workhorse; `raised` is for things that
 * float above content. Elevation only ever comes from the ramp.
 */
export const panelVariants = cva("", {
  variants: {
    variant: {
      plain: "rounded-[var(--radius-container)] bg-card",
      panel: "panel",
      raised: "panel-raised",
      sunken: "panel-sunken",
      floating: "rounded-[var(--radius-floating)] bg-popover shadow-e2",
      ghost: "rounded-[var(--radius-container)] bg-transparent",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6 sm:p-7",
      xl: "p-6 sm:p-8",
    },
    interactive: {
      true: "lift focus-ring",
      false: "",
    },
  },
  defaultVariants: {
    variant: "panel",
    padding: "md",
    interactive: false,
  },
})

export type PanelVariantProps = VariantProps<typeof panelVariants>

/* -------------------------------------------------------------------------- */
/*                                Icon badges                                 */
/* -------------------------------------------------------------------------- */

/**
 * Square, rounded icon container. The single approved way to give an icon
 * emphasis — replaces the hand-rolled `bg-primary/10 border-primary/20` blocks.
 */
export const iconBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center border [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-hairline bg-muted/60 text-foreground",
        primary: "border-primary-border bg-primary-surface text-primary-text",
        success: "border-success-border bg-success-surface text-success-text",
        warning: "border-warning-border bg-warning-surface text-warning-text",
        info: "border-info-border bg-info-surface text-info-text",
        danger: "border-destructive-border bg-destructive-surface text-destructive-text",
      },
      variant: {
        soft: "",
        solid: "",
        outline: "bg-transparent",
      },
      size: {
        xs: "size-6 rounded-md [&>svg]:size-3",
        sm: "size-8 rounded-lg [&>svg]:size-3.5",
        md: "size-10 rounded-xl [&>svg]:size-4",
        lg: "size-12 rounded-xl [&>svg]:size-5",
        xl: "size-14 rounded-2xl [&>svg]:size-6",
      },
    },
    compoundVariants: [
      { variant: "solid", tone: "neutral", class: "bg-foreground text-background" },
      { variant: "solid", tone: "primary", class: "bg-primary text-primary-foreground" },
      { variant: "solid", tone: "success", class: "bg-success text-success-foreground" },
      { variant: "solid", tone: "warning", class: "bg-warning text-warning-foreground" },
      { variant: "solid", tone: "info", class: "bg-info text-info-foreground" },
      { variant: "solid", tone: "danger", class: "bg-destructive text-destructive-foreground" },
    ],
    defaultVariants: {
      tone: "neutral",
      variant: "soft",
      size: "md",
    },
  },
)

export type IconBadgeVariantProps = VariantProps<typeof iconBadgeVariants>

/* -------------------------------------------------------------------------- */
/*                              Status indicators                             */
/* -------------------------------------------------------------------------- */

/** Small pill for state, role and category labels. */
export const tonePillVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium [&>svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-hairline bg-muted/70 text-foreground",
        primary: "border-primary-border bg-primary-surface text-primary-text",
        success: "border-success-border bg-success-surface text-success-text",
        warning: "border-warning-border bg-warning-surface text-warning-text",
        info: "border-info-border bg-info-surface text-info-text",
        danger: "border-destructive-border bg-destructive-surface text-destructive-text",
      },
      size: {
        sm: "type-caption px-2 py-0.5",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
)

export type TonePillVariantProps = VariantProps<typeof tonePillVariants>

/** 8px status dot, optionally with a soft halo for "live" states. */
export const statusDotVariants = cva("inline-block shrink-0 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-muted-foreground/50",
      primary: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      info: "bg-info",
      danger: "bg-destructive",
    },
    size: {
      sm: "size-1.5",
      md: "size-2",
      lg: "size-2.5",
    },
    ring: {
      true: "ring-3 ring-current/15",
      false: "",
    },
  },
  defaultVariants: { tone: "neutral", size: "md", ring: false },
})

export type StatusDotVariantProps = VariantProps<typeof statusDotVariants>

/* -------------------------------------------------------------------------- */
/*                                  Callouts                                  */
/* -------------------------------------------------------------------------- */

/** Inline, non-blocking feedback (form errors, hints, confirmations). */
export const calloutVariants = cva(
  "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-hairline bg-muted/50 text-foreground",
        primary: "border-primary-border bg-primary-surface text-primary-text",
        success: "border-success-border bg-success-surface text-success-text",
        warning: "border-warning-border bg-warning-surface text-warning-text",
        info: "border-info-border bg-info-surface text-info-text",
        danger: "border-destructive-border bg-destructive-surface text-destructive-text",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export type CalloutVariantProps = VariantProps<typeof calloutVariants>

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** Deterministic monogram for an entity without an uploaded image. */
export function monogram(value: string | null | undefined, length = 2) {
  if (!value) return "?"
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, length).toUpperCase()
  return words
    .slice(0, length)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/**
 * Stable tone for an arbitrary key, so the same organization or category keeps
 * the same accent across sessions without storing a colour.
 */
export function toneFromKey(key: string): Exclude<Tone, "neutral"> {
  const palette: Array<Exclude<Tone, "neutral">> = ["primary", "info", "success", "warning", "danger"]
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000
  }
  return palette[hash % palette.length]
}

/* -------------------------------------------------------------------------- */
/*                              Course identity                               */
/* -------------------------------------------------------------------------- */

/** Curated identity accents. Unlike status tones, these never imply state. */
export const COURSE_TONES = [
  "course-1",
  "course-2",
  "course-3",
  "course-4",
  "course-5",
  "course-6",
] as const

export type CourseTone = (typeof COURSE_TONES)[number]

/**
 * Safely maps legacy stored colours (including arbitrary hex values) to a
 * finite, contrast-tested palette. The raw value is never emitted to the DOM.
 */
export function courseToneFromValue(
  value: string | null | undefined,
  fallbackKey = "course",
): CourseTone {
  const source = value?.trim().toLowerCase() || fallbackKey.trim().toLowerCase() || "course"
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33 + source.charCodeAt(index)) >>> 0
  }

  return COURSE_TONES[hash % COURSE_TONES.length]
}
