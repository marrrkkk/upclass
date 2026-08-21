# UpClass Classroom Focus

UpClass is a working classroom tool used throughout the school day on shared laptops and mid-range phones. The interface should help a teacher or student identify the next useful classroom action quickly, then complete it without visual friction.

## Visual Direction

The visual world is a cool, near-white productivity workspace: precise like a gradebook, calm like a prepared lesson plan, and recognizable through course context rather than decorative color. The app is light-only in this phase.

Signature: a restrained course identity rail or swatch accompanies schedule, queue, class, and class-detail content. It keeps classroom context visible while semantic color remains reserved for state and actions.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#f7f8fa` | Application background |
| Surface | `#ffffff` | Working panels and elevated surfaces |
| Subtle surface | `#f1f3f5` | Grouped metadata and secondary regions |
| Active surface | `#eaf4ff` | Selected navigation and focused context |
| Foreground | `#17202a` | Headings and primary content |
| Secondary foreground | `#53606d` | Supporting copy and table metadata |
| Muted foreground | `#7a8794` | Captions and tertiary metadata |
| Primary | `#0075de` | Main action, focus, progress, active signal |
| Primary hover | `#0068c7` | Hover state |
| Primary active | `#005bae` | Pressed state |
| Success | `#16794c` | Completed or healthy state |
| Warning | `#a66b00` | Due soon or attention state |
| Danger | `#c53d45` | Destructive or blocked state |
| Info | `#0f6fb8` | Informational state |

Feature UI consumes semantic tokens only. Raw palette values are limited to data/configuration such as course colors and canvas internals.

## Typography

Geist Sans is the single UI and display family. Geist Mono is reserved for identifiers, codes, and measured data. The hierarchy is:

- Display: dashboard greeting and rare top-level emphasis
- Page title: route title
- Section title: major content region
- Card title: row or panel title
- Body: primary explanation and content
- Body secondary: supporting description
- Label: controls and state labels
- Metadata: timestamps, counts, and class codes
- Caption: low-emphasis helper text

Letter spacing remains neutral. Weight and size, not tracking tricks, create hierarchy.

## Surfaces And Shape

Controls use 8px radii, standard surfaces use 12px, and major floating surfaces use 14px. Pills are reserved for compact statuses and counts. Content panels use a hairline or a subtle fill difference, never both a heavy border and a large shadow. One restrained elevation tier is reserved for navigation, menus, dialogs, and other surfaces that must float.

## Interaction

Hover, focus, press, expand/collapse, navigation, and pending states use 120–280ms transitions. Reduced motion disables authored movement. Focus is always visible. State is communicated with text or icons in addition to color.

## Composition Rules

- Content and task hierarchy outrank decoration.
- Whitespace and typography establish grouping before borders.
- Dashboards lead with what needs attention now.
- Tables remain dense and efficient; they are not converted into card grids.
- Every route has intentional loading, empty, error, permission, offline, and overflow states.
- The sidebar is quiet and compact; the active route uses a subtle blue-tinted surface.
- The primary blue is a functional signal, not a page-wide wash.
- No gradients, decorative orbs, emoji icons, oversized black hero panels, or AI filler copy.

## Responsive Behavior

Desktop uses a compact sidebar and multi-column content where it improves scanning. Tablet compresses the shell and grid. Mobile uses a drawer navigation and a single priority stack: greeting, primary task, today/deadlines, needs attention, classes, secondary context, and activity.

## Product Truth

The design must preserve tenant-aware routing, authentication, organization and class permissions, server-first rendering, Suspense boundaries, caching, offline queueing, realtime updates, AI approval boundaries, and existing data contracts. The current schema does not provide normalized class sessions or attendance; those are not represented as dashboard capabilities in this visual redesign.


## Responsive Design

### Breakpoint Strategy

UpClass uses content-driven responsive behavior with standard Tailwind breakpoints:

- **Mobile**: below `md` (< 768px) — Single-column priority stacks, touch-optimized controls
- **Tablet**: `md` through below `lg` (768px - 1023px) — Two-column layouts where content permits
- **Desktop**: `lg` and above (≥ 1024px) — Sidebar navigation, multi-column dashboards
- **Wide desktop**: `xl` (≥ 1280px) — Additional columns and side rails where beneficial

### Mobile Layout Principles

1. **Single priority-based vertical stack** — No forced horizontal layouts on narrow screens
2. **Touch-target minimum 44px** — Use `touch-target` utility class for interactive elements
3. **Safe-area spacing** — Use `safe-top` and `safe-bottom` utilities for iOS/Android notches
4. **No hover-only interactions** — All controls work with touch and keyboard
5. **Preserve information architecture** — Mobile shows same content, reorganized for vertical flow
6. **Master/detail navigation** — Use `ResponsiveSplitView` for list → detail flows (messages, etc.)

### Responsive Utilities

```css
/* Safe-area spacing for iOS/Android notches */
@utility safe-top {
  padding-top: env(safe-area-inset-top);
}

@utility safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Minimum 44px touch target on touch screens */
@utility touch-target {
  @media (max-width: 767px) {
    min-height: 2.75rem; /* 44px */
  }
}

/* Scroll containment for chip rails, heatmaps, wide tables */
@utility scroll-x-region {
  overflow-x: auto;
  overscroll-behavior-x: contain;
}
```

### Responsive Overlay Pattern

Use `ResponsiveOverlay` for form/detail interactions:
- **Desktop**: shadcn `Dialog` (centered modal)
- **Mobile**: shadcn `Sheet` (bottom/side drawer)

Keep `AlertDialog` for destructive confirmations. Keep `Dialog` for canvas/image/editor workflows requiring maximum viewport area.

```tsx
<ResponsiveOverlay
  open={open}
  onOpenChange={setOpen}
  title="Edit classwork"
  description="Update assignment details"
  desktopClassName="sm:max-w-2xl"
  footer={<Button type="submit">Save</Button>}
>
  {/* Form content */}
</ResponsiveOverlay>
```

### Mobile Data Display

Dense desktop tables transform into mobile-friendly list views:

```tsx
// Desktop: semantic DataTable
<DataTable>...</DataTable>

// Mobile: MobileDataList with expandable rows
<MobileDataList label="Students">
  <MobileDataRow>...</MobileDataRow>
</MobileDataList>
```

**Gradebook Special Case**: Desktop uses comparison table. Mobile uses expandable summary cards showing student average with tap-to-expand assignment details.

### Skeleton Alignment

Every loading skeleton must match the loaded page structure at each viewport:
- Match mobile column stacking
- Match desktop/tablet column counts
- Match card heights and toolbar placement
- Match responsive table/list transformations
- No generic placeholders that diverge from real layout geometry


## Dashboard Architecture

### Role-Specific Dashboard Hierarchy

UpClass provides three distinct dashboard experiences based on user role. Each role receives a different information architecture, content priority, primary action, and supporting modules.

**Guiding principle:** Show the user the next best action for their role, then provide the smallest useful amount of context to complete the school-day workflow.

### Admin Dashboard

Admin role takes priority whenever the user has organization owner or admin permissions. The admin dashboard answers:

- Is the organization healthy?
- What administrative task needs attention?
- What changed recently?
- How do I manage people, classes, and invitations?

**Admin dashboard structure:**

1. **Dashboard header** — Organization-focused greeting, current date, primary admin action
2. **Organization operations rail** — Members count, classes count, pending invitations count, status message
3. **Admin attention queue** — Pending invitations, recently created classes, recent membership changes
4. **Admin workspace shortcuts** — Manage people, Manage classes, Review invitations, Organization settings
5. **Contextual AI entry** — Role-aware briefing prompts (secondary action)
6. **Recent organization activity** — Latest operational changes

**Visual signature:** The organization operations rail is the admin's "today board" — a compact metrics panel with an explicit status message that communicates operational health at a glance.

### Teacher Dashboard

The teacher dashboard prioritizes grading, student communication, overdue work, and class-level activity. It answers:

- What needs grading or a response now?
- Which students may need a check-in?
- What is due or happening across my classes?
- What should I do next?

**Teacher dashboard structure:**

1. **Dashboard header** — Teaching-focused greeting, current date, primary teaching action
2. **Teacher pulse metrics** — To review, Unread questions, Overdue work, Graded this week (zero values suppressed)
3. **Teaching queue + deadlines rail** — Dominant left queue (submissions, questions, overdue alerts) with narrower right rail (upcoming classwork, AI cue)
4. **Daily Class Pulse** — AI-generated briefing when enabled (optional, max-width constrained)
5. **Student check-in section** — Students with no activity in last 7 days
6. **Classes preview** — Teacher's classes with student counts and next due items
7. **Recent activity** — Latest classroom work

**Visual signature:** The teaching queue is the dominant workspace. The rail layout (≥1280px) places actionable queue items on the left and supporting context (deadlines, AI) on the right.

**Primary action priority:**

1. Review submissions (when review queue exists)
2. Reply to students (when unread questions exist)
3. Create assignment (when queue is clear)
4. Open classes (fallback)

### Student Dashboard

The student dashboard prioritizes unfinished work, deadlines, feedback, messages, and direct class entry. It answers:

- What should I complete next?
- What is due soon?
- What feedback or messages are waiting?
- Which class should I continue working in?

**Student dashboard structure:**

1. **Dashboard header** — Learning-focused greeting, current date, primary learning action
2. **Next learning action** — Prominent "continue where you left off" or "next up" panel showing the nearest unfinished item or recently graded work
3. **Attention queue + timeline rail** — Left queue (due soon, graded, messages, announcements) with right rail (learning runway timeline, AI cue)
4. **Daily Class Pulse** — AI-generated briefing when enabled (optional, max-width constrained)
5. **Feedback & messages** — Recently graded work with feedback and unread messages (two-column grid)
6. **Classes preview** — Student's enrolled classes with next due items
7. **Recent activity** — Latest classroom work

**Visual signature:** The "next learning action" panel is the student's "runway" — a prominent panel at the top of the content that shows the single most relevant unfinished item or recently graded work with a clear call-to-action.

**Next action priority:**

1. Recently graded work with feedback
2. Unsubmitted item due soonest
3. In-progress or draft item (if state exists)
4. Nearest upcoming item
5. Open classes (fallback when all caught up)

**Timeline buckets:** The learning runway in the right rail groups work by: Due today, Due this week, Later, Recently completed.

### Admin Role Priority

Admin mode takes absolute priority when the user has organization owner or admin permissions, even if they also teach classes. There is no role switcher. This ensures administrators can access organizational operations without navigating through teaching or student views first.

**Resolution logic:**

1. Check organization membership role
2. If role is `owner` or `admin`, render admin dashboard
3. Otherwise, resolve teacher vs. student based on class ownership

### Dashboard Visual Language

All three dashboards share:

- **Dashboard header** — Greeting, subtitle, date, primary action (responsive: stacks on mobile, horizontal on tablet+)
- **Cool near-white canvas** — `bg-background` (#f7f8fa)
- **White working surfaces** — `bg-surface` (#ffffff)
- **Semantic UpClass blue** — `text-primary` / `bg-primary` for primary actions and active states
- **Course colors** — Used only as class identity (swatches, not status signals)
- **Geist typography** — Consistent hierarchy across roles
- **Restrained elevation** — 12px radius for panels, hairline borders, `shadow-e1` for floating menus
- **8px control radius, 12px panel radius**
- **No gradients, decorative blobs, oversized hero art, or generic SaaS statistics wall**

### Role-Specific "Today Board" Signature

Each role has one memorable signature element that communicates immediate work:

- **Admin:** Organization operations rail (metrics + status message)
- **Teacher:** Teaching queue rail (dominant left workspace)
- **Student:** Next learning action (prominent continue/next up panel)

These elements visually communicate the role's immediate work without becoming large marketing-style heroes.

### Motion and Interaction

Use motion only for:

- Initial queue reveal (enter transitions)
- State changes after completing/dismissing an item
- Expand/collapse of grouped work
- AI briefing generation

Respect `prefers-reduced-motion`. All motion is optional enhancement, never required for interaction.

### Empty States

Dashboard empty states are truthful and role-specific:

- **Admin empty:** "Organization is empty. Invite people or create classes to get started."
- **Teacher empty queue:** "Your teaching queue is clear. New submissions and student questions will appear here."
- **Student empty attention:** "Nothing needs attention. New work, messages, and graded assignments will appear here."
- **Student all caught up:** "All caught up. No urgent work right now. Check your classes for upcoming assignments."

Empty states use `CheckCircle2` icon with success tone for positive empty states (all caught up, queue clear) and neutral tone for informational empty states (no classes yet, no data available).

### Dashboard Data Loading

- **Route-level Suspense** — Dashboard page wraps `<DashboardData>` in Suspense with role-agnostic `<DashboardOverviewSkeleton>`
- **Role-specific view models** — Server-side data layer builds typed `AdminDashboardViewModel`, `TeacherDashboardViewModel`, or `StudentDashboardViewModel`
- **Parallel fetching** — Independent sections (classes, deadlines, activity, pulse) fetch in parallel
- **Localized Suspense** — Heavy sections can use additional Suspense boundaries where appropriate
- **Skeleton parity** — Role-specific skeletons (`AdminDashboardSkeleton`, `TeacherDashboardSkeleton`, `StudentDashboardSkeleton`) match loaded layout geometry to prevent layout shift

### Responsive Dashboard Behavior

**Mobile (< 768px):**

- One-column priority stack
- Primary action spans available width
- Queue rows use full-width touch targets (minimum 44px height)
- Metrics become compact horizontal strip or two-column list when labels remain readable
- Secondary sections remain inline (not hidden behind tabs unless genuinely secondary)
- Bottom navigation safe-area spacing (`pb-safe-bottom`)

**Tablet (768px - 1023px):**

- Compressed two-column layout where both columns remain readable
- Queue + rail may collapse to single column if rail width becomes unusable
- Touch-safe controls maintained

**Desktop (≥ 1024px):**

- Wider content container
- Admin: single column with wider panels
- Teacher: dominant queue (left) + narrower rail (right)
- Student: dominant queue (left) + narrower timeline rail (right)

**Wide desktop (≥ 1280px):**

- Teacher and student use `xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]` for queue + rail
- Rail minimum width: 18rem (288px)
- No uniform grid of identical statistic cards

### Dashboard Anti-Patterns

**Do not:**

- Show teacher grading queue or student assignment workflow in admin dashboard
- Mix role-specific content incorrectly (e.g., teacher metrics on student dashboard)
- Hide important queue items to reduce page height on mobile
- Use course colors as status signals (course colors = identity only)
- Create nested bordered cards inside panels (avoid "shadcn dashboard" appearance)
- Invent unsupported data (attendance, class sessions, grades, ranking, progress percentages, engagement scores, historical trends)
- Make AI the dominant page experience (AI remains contextual and secondary)
- Use zero-value metric cards as visual filler (suppress metrics with value = 0)
- Force identical card layouts across all roles

**Do:**

- Lead with role-specific next action
- Suppress zero-value metrics from pulse strip
- Provide truthful empty states with clear next steps
- Keep class colors as identity swatches, not everywhere
- Use one elevation tier deliberately (panels on canvas, menus/dialogs above panels)
- Base dashboard content on real stored data only
- Maintain clear hierarchy: action → queue → context → classes → activity
- Use responsive grids that preserve content priority on mobile
