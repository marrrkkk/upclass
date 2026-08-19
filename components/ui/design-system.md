# UpClass UI System

The UI system is documented in [`DESIGN.md`](../../DESIGN.md). This file is the implementation reference for shared primitives.

## Use semantic tokens

Use `bg-background`, `bg-card`, `bg-surface`, `bg-surface-subtle`, `bg-surface-active`, `text-foreground`, `text-foreground-secondary`, `text-foreground-muted`, `text-primary-text`, and semantic state tones. Do not use raw Tailwind palette steps in feature UI.

## Surface hierarchy

- `Panel` groups related content with a quiet surface and hairline.
- `Card` is for a discrete repeated item or genuinely framed tool.
- `surface-raised` is reserved for menus, dialogs, sheets, and floating tools.
- Avoid panels inside panels and borders around every control.

## Typography

Use `Text` or `typographyVariants` with the shared `display`, `h1`, `h2`, `h3`, `h4`, `body`, `small`, `caption`, `overline`, and `mono` variants. Use headings for hierarchy, not small gray overlines.

## Controls

Use `Button` for commands, `IconButton` patterns with tooltips for compact symbol actions, `Field` for labeled forms, `StatusBadge` for explicit state, `EntityAvatar` for people, `DataTable` for dense records, and `EmptyState` for truthful empty/error states.

Every interactive primitive must expose hover, focus-visible, active, disabled, and loading behavior where applicable.


## Dashboard Composition

Dashboard components follow specific composition rules to maintain role-specific clarity and prevent generic SaaS dashboard appearance.

### Dashboard Primitives

**Core Components:**

- `DashboardShell` — Outer frame with consistent spacing (`space-y-6 pb-10 sm:space-y-8 lg:space-y-10`)
- `DashboardSection` — Section wrapper with spacing (`space-y-3 sm:space-y-4`)
- `DashboardGrid` — Responsive grid with variants: `default`, `primary-rail` (queue + rail), `equal`
- `DashboardHeader` — Page header with greeting, subtitle, date, primary action (responsive flex)
- `DashboardMetricStrip` — Horizontal metrics with zero-value suppression
- `DashboardEmptyState` — Truthful empty states with compact and full variants
- `DashboardNextAction` — Student next action panel (prominent continue/next up)
- `DashboardAttentionQueue` — Role-specific queue (admin/teacher/student variants)
- `DashboardDeadlines` — Upcoming classwork with submission counts (teacher/student variants)
- `DashboardClassList` — Compact class directory preview
- `DashboardActivity` — Recent activity section
- `DashboardAiCue` — Contextual AI entry with role-aware prompts

### Dashboard Layout Rules

1. **One signature element per role** — Admin: operations rail, Teacher: teaching queue, Student: next action panel
2. **Primary-rail grid** — Dominant left column (1.45fr) + narrower right rail (0.55fr, min 18rem) at `xl` breakpoint
3. **No nested panels inside panels** — Dashboard sections use `Panel` on canvas; queue items do not add another panel layer
4. **Border suppression** — Queue rows, metric strips, and action panels do not duplicate borders when composed inside a parent panel
5. **Zero-value metric suppression** — Metrics with `visible: false` are not rendered (no visual filler)
6. **Empty state tone** — Use `success` tone for positive empty states (all caught up, queue clear), `neutral` for informational empty states
7. **Skeleton parity** — Role-specific skeletons match loaded layout geometry (same grid, same spacing, stable heights)

### Queue and List Patterns

**Queue item anatomy:**

```tsx
<li>
  <Link className="touch-target focus-ring group flex items-start gap-3 px-4 py-3 hover:bg-surface-hover">
    <CourseSwatch /> {/* or icon badge */}
    <span className="flex-1 space-y-0.5">
      <Text variant="h4">{title}</Text>
      <Text variant="small" tone="muted">{context}</Text>
      <Text variant="caption" tone="muted">{metadata}</Text>
    </span>
    <StatusBadge /> {/* optional */}
    <ArrowRight className="shrink-0" />
  </Link>
</li>
```

**Rules:**

- Minimum 44px touch height on mobile
- `touch-target` utility for full row interaction
- `focus-ring` for keyboard navigation
- `hover:bg-surface-hover` for mouse feedback
- `group` for coordinated icon/text color changes
- `truncate` on text that may overflow
- `shrink-0` on icons and badges

### Metric Strip Pattern

```tsx
<dl className="flex flex-wrap gap-x-6 gap-y-3">
  {metrics.filter(m => m.visible).map(metric => (
    <div key={metric.label} className="flex items-baseline gap-2">
      <dd className="type-h2 numeric-tabular">{metric.value}</dd>
      <dt className="type-caption text-muted-foreground">{metric.label}</dt>
    </div>
  ))}
</dl>
```

**Rules:**

- Suppress zero-value metrics (filter `visible: true`)
- Use `numeric-tabular` for numeric values
- Value before label for visual hierarchy
- Horizontal flex wrap for responsive behavior

### Empty State Variants

**Compact (inline):**

```tsx
<DashboardEmptyState
  icon={CheckCircle2}
  title="Your teaching queue is clear"
  description="New submissions will appear here."
  tone="success"
  compact
/>
```

**Full (with action):**

```tsx
<DashboardEmptyState
  icon={Building2}
  title="No classes yet"
  description="Create or join a class to start."
  tone="neutral"
  action={<Button asChild><Link href="/classes">Browse classes</Link></Button>}
/>
```

### Dashboard Responsive Behavior

**Mobile stack priorities:**

1. Dashboard header (greeting, action)
2. Role signature (next action, operations rail, or metrics)
3. Primary queue
4. Supporting context (deadlines, timeline)
5. AI cue
6. Classes preview
7. Recent activity

**Grid collapse:**

- `primary-rail` grid collapses to single column below `xl`
- `equal` grid collapses to single column below `md`
- Metric strip remains horizontal but wraps

### Dashboard Anti-Patterns

**Avoid:**

- Placing bordered inputs/selects/buttons inside another bordered panel without visual adjustment
- Stacking multiple panels with identical elevation
- Using course colors as status indicators (course colors = identity only)
- Creating uniform grids of identical metric cards
- Hiding non-zero queue items to reduce height
- Mixing role-specific primitives (teacher metrics on student dashboard)
- Rendering zero-value metrics as visual filler

**Prefer:**

- One clear elevation tier (panels on canvas, floating menus above)
- Selective borders (queue rows inside borderless panel body, or vice versa)
- Course swatches as compact identity markers
- Truthful empty states over fake placeholder content
- Role-specific view models with explicit types
- Suppressed zero-value metrics for clean pulse strips
