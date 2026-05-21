# UpClass UI Design Guide

> Source of truth for building consistent UI. Derived from DESIGN-EXPORT.md.
> All token values, utility classes, and patterns come directly from that specification.

---

## Design Philosophy

- Calm, modern, minimalist, polished, practical
- Layered surfaces with subtle gradient backgrounds and inset highlights
- Deep, diffuse shadows that create depth without heaviness
- Semantic tokens everywhere — no raw palette colors in components
- Everything works in both light and dark mode
- Sidebar is a persistent navigation shell

---

## Design Principles

1. Use semantic tokens, not raw color classes, for all product UI.
2. Prefer `components/ui/*` and shared wrappers before custom markup.
3. Use `gap-*` over `space-y-*` for all spacing.
4. Keep variants and sizes aligned with documented names.
5. Preserve focus states, contrast, and accessible labels.
6. Motion should clarify interaction, not decorate.
7. No inline visual styles for colors, shadows, radii, spacing, or typography.
8. No raw palette utilities (e.g., `text-emerald-*`, `bg-amber-*`).

---

## Stack

- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- shadcn/ui components (Tailwind v4 compatible)
- `class-variance-authority` for component variants
- Geist Sans + Geist Mono fonts (via `geist` package + `next/font`)
- `tw-animate-css` for animation utilities

---

## Color Tokens

### Light Mode (`:root`)

| Token | Value |
|-------|-------|
| `--background` | `#f7f9fb` |
| `--foreground` | `#0f1c2e` |
| `--card` | `#ffffff` |
| `--card-foreground` | `#0f1c2e` |
| `--popover` | `#ffffff` |
| `--popover-foreground` | `#0f1c2e` |
| `--primary` | `#2f9fee` |
| `--primary-foreground` | `#f0f9ff` |
| `--secondary` | `#f0f4f8` |
| `--secondary-foreground` | `#1a3550` |
| `--muted` | `#edf2f7` |
| `--muted-foreground` | `#5f7082` |
| `--accent` | `#e8f4fd` |
| `--accent-foreground` | `#0c2d44` |
| `--destructive` | `#c9372c` |
| `--border` | `#d4dce6` |
| `--input` | `#d4dce6` |
| `--ring` | `#4db5ff` |
| `--radius` | `0.75rem` |

### Dark Mode (`.dark`)

| Token | Value |
|-------|-------|
| `--background` | `#121212` |
| `--foreground` | `#ededed` |
| `--card` | `#1c1c1c` |
| `--card-foreground` | `#ededed` |
| `--popover` | `#1c1c1c` |
| `--popover-foreground` | `#ededed` |
| `--primary` | `#2f9fee` |
| `--primary-foreground` | `#f0f9ff` |
| `--secondary` | `#1f1f1f` |
| `--secondary-foreground` | `#e7e7e7` |
| `--muted` | `#171717` |
| `--muted-foreground` | `#8b9092` |
| `--accent` | `#242424` |
| `--accent-foreground` | `#ededed` |
| `--destructive` | `#c9372c` |
| `--border` | `rgb(255 255 255 / 0.07)` |
| `--input` | `rgb(255 255 255 / 0.08)` |
| `--ring` | `#4db5ff` |

### Sidebar Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar` | `#f6f8fb` | `#161616` |
| `--sidebar-foreground` | `#0f1c2e` | `#ededed` |
| `--sidebar-primary` | `#2f9fee` | `#2f9fee` |
| `--sidebar-primary-foreground` | `#f0f9ff` | `#f0f9ff` |
| `--sidebar-accent` | `#edf2f7` | `#202020` |
| `--sidebar-accent-foreground` | `#0c2d44` | `#ededed` |
| `--sidebar-border` | `#d5dde7` | `rgb(255 255 255 / 0.06)` |
| `--sidebar-ring` | `#4db5ff` | `#4db5ff` |

---

## Surface Tokens

### Light Mode

| Token | Value |
|-------|-------|
| `--surface-elevated-bg` | `linear-gradient(180deg, rgb(255 255 255 / 0.96) 0%, rgb(255 255 255 / 0.99) 100%)` |
| `--surface-soft-bg` | `linear-gradient(180deg, rgb(252 253 255 / 0.84) 0%, rgb(247 249 252 / 0.96) 100%)` |
| `--surface-muted-bg` | `linear-gradient(180deg, rgb(248 250 253 / 0.8) 0%, rgb(242 245 250 / 0.95) 100%)` |
| `--surface-stroke` | `rgb(212 220 230 / 0.94)` |
| `--surface-footer-bg` | `linear-gradient(180deg, rgb(247 249 252 / 0.42), rgb(240 244 250 / 0.72))` |

### Dark Mode

| Token | Value |
|-------|-------|
| `--surface-elevated-bg` | `linear-gradient(180deg, rgb(28 28 28 / 0.98) 0%, rgb(24 24 24 / 1) 100%)` |
| `--surface-soft-bg` | `linear-gradient(180deg, rgb(25 25 25 / 0.94) 0%, rgb(21 21 21 / 0.98) 100%)` |
| `--surface-muted-bg` | `linear-gradient(180deg, rgb(23 23 23 / 0.92) 0%, rgb(19 19 19 / 0.98) 100%)` |
| `--surface-stroke` | `rgb(255 255 255 / 0.065)` |
| `--surface-footer-bg` | `linear-gradient(180deg, rgb(24 24 24 / 0.82), rgb(19 19 19 / 0.96))` |

---

## Control Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--control-bg` | `rgb(255 255 255 / 0.92)` | `rgb(28 28 28 / 0.96)` |
| `--control-bg-strong` | `rgb(255 255 255 / 0.98)` | `rgb(32 32 32 / 0.98)` |
| `--control-secondary-bg` | `rgb(240 244 248 / 0.95)` | `rgb(31 31 31 / 0.95)` |
| `--control-accent-bg` | `rgb(232 244 253 / 0.74)` | `rgb(36 36 36 / 0.9)` |
| `--control-border` | `rgb(212 220 230 / 0.95)` | `rgb(255 255 255 / 0.075)` |

---

## Overlay, Table, Tooltip, Alert Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--modal-backdrop` | `rgb(0 0 0 / 0.44)` | `rgb(0 0 0 / 0.56)` |
| `--tooltip-surface-bg` | `#0f1c2e` | `#202020` |
| `--tooltip-surface-fg` | `#f7f9fb` | `#ededed` |
| `--table-header-bg` | `rgb(237 242 247 / 0.4)` | `rgb(255 255 255 / 0.03)` |
| `--table-row-hover-bg` | `rgb(232 244 253 / 0.35)` | `rgb(255 255 255 / 0.04)` |
| `--table-row-selected-bg` | `rgb(240 244 248 / 0.85)` | `rgb(255 255 255 / 0.06)` |

---

## Motion Tokens

| Token | Value |
|-------|-------|
| `--motion-duration-fast` | `160ms` |
| `--motion-duration-base` | `220ms` |
| `--motion-duration-slow` | `320ms` |
| `--motion-ease-standard` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `--motion-ease-emphasized` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--motion-lift-distance` | `2px` |

---

## Typography

Font: **Geist Sans** (`--font-geist-sans`) for body + headings, **Geist Mono** (`--font-geist-mono`) for code.

| Role | Classes |
|------|---------|
| Page title | `font-heading text-[2rem] sm:text-[2.3rem] leading-tight font-semibold tracking-tight` |
| Section title | `font-heading text-lg leading-tight font-semibold tracking-tight` |
| Form section title | `text-[0.95rem] font-semibold tracking-tight` |
| Body | `text-sm leading-6` |
| Supporting body | `text-sm leading-6 text-muted-foreground` |
| Long-form supporting | `text-sm leading-7 text-muted-foreground` |
| Field label | `text-sm leading-[1.35] font-medium` |
| Meta label | `text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground` |
| Caption/code | `font-mono text-[0.72rem]` |

---

## Spacing & Radius

### Spacing (use `gap-*`, never `space-y-*`)

| Context | Gap |
|---------|-----|
| Tight control groups | `gap-2` to `gap-3` |
| Card bodies, form sections | `gap-4` to `gap-6` |
| Page sections | `gap-6` to `gap-8` |

### Radius

| Element | Class | Computed |
|---------|-------|----------|
| Controls (buttons, inputs) | `rounded-lg` | `0.75rem` |
| Cards, tables, sections | `rounded-xl` | `1.05rem` |
| Large overlays (dialogs) | `rounded-2xl` | `1.35rem` |

Scale: `--radius-sm` (×0.6), `--radius-md` (×0.8), `--radius-lg` (base), `--radius-xl` (×1.4), `--radius-2xl` (×1.8), `--radius-3xl` (×2.2), `--radius-4xl` (×2.6)

---

## Utility Classes

All defined in `app/globals.css` under `@layer utilities`:

| Class | What it applies |
|-------|-----------------|
| `surface-card` | `border: 1px solid var(--surface-stroke)` + `background: var(--surface-elevated-bg)` + `box-shadow: var(--surface-card-shadow)` |
| `surface-card-footer` | `background: var(--surface-footer-bg)` + inset top highlight |
| `control-surface` | `border-color: var(--control-border)` + `background: var(--control-bg)` + `box-shadow: var(--control-shadow)` |
| `control-surface-secondary` | Muted control with 82% border opacity + secondary bg |
| `control-ghost-surface` | Transparent border + bg + no shadow |
| `overlay-surface` | Elevated bg + border + lg shadow for modals |
| `modal-backdrop` | `background: var(--modal-backdrop)` |
| `tooltip-surface` | Dark inverted bg + fg + border + shadow |
| `table-head-surface` | `background: var(--table-header-bg)` |
| `table-row-surface` | Hover/focus-within/selected transitions |
| `empty-surface` | Soft bg + subtle shadow for empty states |
| `alert-surface` | Info alert bg + shadow |
| `alert-destructive-surface` | Destructive alert bg + shadow |
| `hero-panel` | `rounded-xl` + stroke border + elevated bg + lg shadow + overflow hidden |
| `section-panel` | `rounded-xl` + stroke border + elevated bg + lg shadow |
| `soft-panel` | `rounded-lg` + muted bg + sm shadow |
| `meta-label` | 0.68rem uppercase tracking meta text |
| `eyebrow` | Pill-shaped meta tag with border |
| `motion-transition` | Multi-property transition at fast duration |
| `motion-lift` | Hover lifts 2px on pointer devices |

---

## Body & Base Layer

```css
html: scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgb(212 220 230 / 0.5) transparent;
body light: background-image: linear-gradient(180deg, #ffffff 0%, #f8fafb 42%, #f3f6fa 100%);
body dark:  background-image: linear-gradient(180deg, #161616 0%, #121212 42%, #0d0d0d 100%);
::selection: color-mix(in srgb, var(--color-primary) 22%, white);
```

---

## Component Specifications

### Button

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
Sizes: `default` (h-9 px-4 py-2), `xs` (h-7 px-2.5), `sm` (h-8 px-3), `lg` (h-11 px-6), `icon` (size-9), `icon-xs` (size-7), `icon-sm` (size-8), `icon-lg` (size-11)

| Variant | Classes |
|---------|---------|
| `default` | `button-primary-fixed hover:-translate-y-px` |
| `outline` | `border control-surface hover:bg-[var(--control-bg-strong)] hover:shadow-[var(--control-shadow-hover)]` |
| `secondary` | `border control-surface-secondary` |
| `ghost` | `control-ghost-surface hover:bg-[var(--control-accent-bg)]` |
| `destructive` | `button-destructive-fixed hover:-translate-y-px` |
| `link` | `bg-transparent underline-offset-4 hover:underline` |

Base: `group/button shrink-0 select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150`
Focus: `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15`

### Input

- Class: `control-surface`
- Height: `h-10`, radius: `rounded-lg`, border: `border-input/95`
- Focus: `focus-visible:border-ring focus-visible:bg-[var(--control-bg-strong)] focus-visible:ring-4 focus-visible:ring-ring/15`
- Error: `aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10`

### Card

- Class: `surface-card rounded-xl`
- Default padding: `px-4 pt-4 sm:px-6 sm:pt-6 gap-5`
- Compact: `size="sm"` → `p-3 gap-3`
- Footer: `surface-card-footer border-t border-border/75`

### Badge

Variants: `default`, `secondary`, `destructive`, `outline`
Base: `h-6 px-2.5 rounded-md`

| Variant | Classes |
|---------|---------|
| `default` | `bg-primary text-primary-foreground shadow-[var(--control-primary-shadow)]` |
| `secondary` | `control-surface-secondary` |
| `destructive` | `bg-destructive/10 text-destructive` |
| `outline` | `control-surface text-foreground` |

### Dialog / Sheet

- Content: `overlay-surface rounded-2xl`
- Backdrop: `modal-backdrop`

### Table

- Header: `table-head-surface`
- Rows: `table-row-surface` (auto hover + focus-within + selected states)
- Footer: `table-foot-surface`

### Tooltip

- Content: `tooltip-surface` (dark inverted with border + shadow)

### Alert

| Variant | Class |
|---------|-------|
| `default` | `alert-surface` |
| `destructive` | `alert-destructive-surface` |

---

## Sidebar Architecture

### Dimensions
- Expanded: `--sidebar-width: 17.5rem`
- Collapsed (icon): `--sidebar-width-icon: 4.25rem`
- Mobile sheet: `--sidebar-width-mobile: 18rem`

### Features
- SidebarProvider manages expanded/collapsed state via React context
- Cookie persistence (`sidebar_state`)
- Keyboard shortcut: `Cmd/Ctrl+B` toggles
- Desktop: fixed panel with animated width transitions
- Mobile: Sheet overlay from left
- `collapsible="icon"` shrinks to icon strip with tooltips

### Layout Structure

```tsx
<SidebarProvider defaultOpen style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" }}>
  <Sidebar collapsible="icon">
    <SidebarHeader>{/* Logo + org switcher */}</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>{/* User avatar + info */}</SidebarFooter>
    <SidebarRail />
  </Sidebar>

  <SidebarInset>
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-[12px]">
      <SidebarTrigger />
      {/* breadcrumbs, actions */}
    </header>
    <div className="flex-1 px-4 py-6 sm:px-6 md:px-8">
      {children}
    </div>
  </SidebarInset>
</SidebarProvider>
```

### Active Navigation Styling

```
data-[active=true]:border-sidebar-primary/12
data-[active=true]:bg-sidebar-primary/12
data-[active=true]:text-primary
data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]
dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
```

### Collapsed (Icon) Mode
- Labels hidden, buttons become `size-10` squares
- Group labels get `-mt-8 opacity-0`
- Content `overflow-hidden`
- Tooltips appear on hover via `tooltip` prop

---

## Page Patterns

### Standard page

```tsx
<section className="flex-1 space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="font-heading text-[2rem] font-semibold tracking-tight">Title</h1>
    <Button>Action</Button>
  </div>
  <Card>...</Card>
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">...</div>
</section>
```

### Empty state

```tsx
<div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
    <Icon className="h-8 w-8 text-primary" />
  </div>
  <h3 className="mt-4 text-2xl font-bold text-foreground">Title</h3>
  <p className="mt-2 max-w-md mx-auto text-muted-foreground">Description</p>
  <div className="mt-6 flex items-center justify-center gap-3">
    <Button>Primary</Button>
    <Button variant="outline">Secondary</Button>
  </div>
</div>
```

---

## Focus & Accessibility

- Interactive focus: `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15`
- Error state: `aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10`
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`
- Always include `sr-only` labels for icon-only buttons
- Contrast maintained through token values

---

## Dark Mode

- Activated via `.dark` class on `<html>` (next-themes)
- All tokens auto-switch via `:root` / `.dark` selectors
- Custom variant: `@custom-variant dark (&:is(.dark *))` for Tailwind v4
- Body gradient switches automatically
- Scrollbar adapts automatically

---

## Do NOT

- Use raw palette utilities (`text-emerald-500`, `bg-amber-100`, etc.)
- Use `space-y-*` (use `gap-*`)
- Add flashy animations or decorative motion
- Inline visual styles for colors, shadows, or radii
- Use `hsl(var(...))` — tokens are hex/rgb, consumed directly
- Mix font families beyond Geist Sans + Geist Mono

---

## File Reference

| File | Purpose |
|------|---------|
| `DESIGN-EXPORT.md` | Complete specification with all exact token values and CSS |
| `app/globals.css` | Implemented tokens, @theme, base layer, utility classes, button CSS |
| `components/ui/*` | shadcn primitives (Button, Input, Card, Badge, Dialog, Table, etc.) |
| `components/ui/sidebar.tsx` | Full sidebar provider + sub-components |
| `components/layouts/home-shell.tsx` | Dashboard shell (SidebarProvider + layout) |
| `app/layout.tsx` | Root layout with Geist fonts configured |
