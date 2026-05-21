# Design System Implementation Guide

## Overview

This document defines a complete UI design system to be implemented across your app. It uses **shadcn/ui** primitives, custom CSS design tokens, Tailwind CSS v4, and shared utility classes to create a calm, modern, minimalist, polished, and practical interface with full dark mode support.

**Important:** This includes the full primary color (`#2f9fee` blue) and all derived colors harmonized to match.

---

## Stack Requirements

- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- shadcn/ui components (latest, Tailwind v4 compatible)
- `class-variance-authority` for component variants
- Geist Sans + Geist Mono fonts (via `next/font` or equivalent)
- `tw-animate-css` for animation utilities

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

## Color Tokens (CSS Custom Properties)

### Light Mode (`:root`)

```css
:root {
  --background: #f7f9fb;
  --foreground: #0f1c2e;
  --card: #ffffff;
  --card-foreground: #0f1c2e;
  --popover: #ffffff;
  --popover-foreground: #0f1c2e;
  --primary: #2f9fee;
  --primary-foreground: #f0f9ff;
  --secondary: #f0f4f8;
  --secondary-foreground: #1a3550;
  --muted: #edf2f7;
  --muted-foreground: #5f7082;
  --accent: #e8f4fd;
  --accent-foreground: #0c2d44;
  --destructive: #c9372c;
  --border: #d4dce6;
  --input: #d4dce6;
  --ring: #4db5ff;
  --radius: 0.75rem;
  --chart-1: #2f9fee;
  --chart-2: #5bb8f5;
  --chart-3: #1a7fd4;
  --chart-4: #7cc8fa;
  --chart-5: #0e5a9e;
  --sidebar: #f6f8fb;
  --sidebar-foreground: #0f1c2e;
  --sidebar-primary: #2f9fee;
  --sidebar-primary-foreground: #f0f9ff;
  --sidebar-accent: #edf2f7;
  --sidebar-accent-foreground: #0c2d44;
  --sidebar-border: #d5dde7;
  --sidebar-ring: #4db5ff;
}
```

### Dark Mode (`.dark`)

```css
.dark {
  --background: #121212;
  --foreground: #ededed;
  --card: #1c1c1c;
  --card-foreground: #ededed;
  --popover: #1c1c1c;
  --popover-foreground: #ededed;
  --primary: #2f9fee;
  --primary-foreground: #f0f9ff;
  --secondary: #1f1f1f;
  --secondary-foreground: #e7e7e7;
  --muted: #171717;
  --muted-foreground: #8b9092;
  --accent: #242424;
  --accent-foreground: #ededed;
  --destructive: #c9372c;
  --border: rgb(255 255 255 / 0.07);
  --input: rgb(255 255 255 / 0.08);
  --ring: #4db5ff;
  --chart-1: #2f9fee;
  --chart-2: #5bb8f5;
  --chart-3: #5fa4bc;
  --chart-4: #f2ca6b;
  --chart-5: #7cc8fa;
  --sidebar: #161616;
  --sidebar-foreground: #ededed;
  --sidebar-primary: #2f9fee;
  --sidebar-primary-foreground: #f0f9ff;
  --sidebar-accent: #202020;
  --sidebar-accent-foreground: #ededed;
  --sidebar-border: rgb(255 255 255 / 0.06);
  --sidebar-ring: #4db5ff;
}
```

---

## Extended Surface Tokens

These provide the layered, glass-like surface system. Define in both `:root` and `.dark`.

### Light Mode Surfaces

```css
:root {
  --surface-elevated-bg: linear-gradient(180deg, rgb(255 255 255 / 0.96) 0%, rgb(255 255 255 / 0.99) 100%);
  --surface-soft-bg: linear-gradient(180deg, rgb(252 253 255 / 0.84) 0%, rgb(247 249 252 / 0.96) 100%);
  --surface-muted-bg: linear-gradient(180deg, rgb(248 250 253 / 0.8) 0%, rgb(242 245 250 / 0.95) 100%);
  --surface-stroke: rgb(212 220 230 / 0.94);
  --surface-shadow-lg: inset 0 1px 0 rgb(255 255 255 / 0.56), inset 0 -1px 0 rgb(15 28 46 / 0.05), 0 1px 2px rgb(15 23 42 / 0.04), 0 8px 14px -10px rgb(15 23 42 / 0.08), 0 22px 40px -30px rgb(15 28 46 / 0.2);
  --surface-card-shadow: inset 0 1px 0 rgb(255 255 255 / 0.58), inset 0 -1px 0 rgb(15 28 46 / 0.05), 0 1px 2px rgb(15 23 42 / 0.04), 0 7px 12px -9px rgb(15 23 42 / 0.07), 0 18px 32px -28px rgb(15 28 46 / 0.18);
  --surface-shadow-md: inset 0 1px 0 rgb(255 255 255 / 0.54), inset 0 -1px 0 rgb(15 28 46 / 0.04), 0 1px 2px rgb(15 23 42 / 0.035), 0 6px 10px -8px rgb(15 23 42 / 0.06), 0 14px 24px -22px rgb(15 28 46 / 0.14);
  --surface-shadow-sm: inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -1px 0 rgb(15 28 46 / 0.035), 0 1px 1px rgb(15 23 42 / 0.03), 0 4px 8px -7px rgb(15 23 42 / 0.05), 0 10px 18px -18px rgb(15 28 46 / 0.12);
  --surface-footer-bg: linear-gradient(180deg, rgb(247 249 252 / 0.42), rgb(240 244 250 / 0.72));
}
```

### Dark Mode Surfaces

```css
.dark {
  --surface-elevated-bg: linear-gradient(180deg, rgb(28 28 28 / 0.98) 0%, rgb(24 24 24 / 1) 100%);
  --surface-soft-bg: linear-gradient(180deg, rgb(25 25 25 / 0.94) 0%, rgb(21 21 21 / 0.98) 100%);
  --surface-muted-bg: linear-gradient(180deg, rgb(23 23 23 / 0.92) 0%, rgb(19 19 19 / 0.98) 100%);
  --surface-stroke: rgb(255 255 255 / 0.065);
  --surface-shadow-lg: inset 0 1px 0 rgb(255 255 255 / 0.06), inset 0 -1px 0 rgb(0 0 0 / 0.28), 0 1px 2px rgb(0 0 0 / 0.3), 0 10px 18px -14px rgb(0 0 0 / 0.24), 0 24px 42px -30px rgb(0 0 0 / 0.38);
  --surface-card-shadow: inset 0 1px 0 rgb(255 255 255 / 0.065), inset 0 -1px 0 rgb(0 0 0 / 0.3), 0 1px 2px rgb(0 0 0 / 0.32), 0 8px 14px -12px rgb(0 0 0 / 0.24), 0 18px 32px -26px rgb(0 0 0 / 0.34);
  --surface-shadow-md: inset 0 1px 0 rgb(255 255 255 / 0.055), inset 0 -1px 0 rgb(0 0 0 / 0.26), 0 1px 2px rgb(0 0 0 / 0.28), 0 7px 12px -10px rgb(0 0 0 / 0.22), 0 14px 24px -20px rgb(0 0 0 / 0.28);
  --surface-shadow-sm: inset 0 1px 0 rgb(255 255 255 / 0.05), inset 0 -1px 0 rgb(0 0 0 / 0.24), 0 1px 1px rgb(0 0 0 / 0.24), 0 5px 10px -9px rgb(0 0 0 / 0.2), 0 10px 18px -16px rgb(0 0 0 / 0.24);
  --surface-footer-bg: linear-gradient(180deg, rgb(24 24 24 / 0.82), rgb(19 19 19 / 0.96));
}
```

### Control Tokens (both modes)

```css
:root {
  --control-bg: rgb(255 255 255 / 0.92);
  --control-bg-strong: rgb(255 255 255 / 0.98);
  --control-secondary-bg: rgb(240 244 248 / 0.95);
  --control-secondary-bg-strong: rgb(240 244 248 / 1);
  --control-accent-bg: rgb(232 244 253 / 0.74);
  --control-border: rgb(212 220 230 / 0.95);
  --control-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -1px 0 rgb(15 28 46 / 0.04), 0 1px 2px rgb(15 23 42 / 0.04);
  --control-shadow-hover: inset 0 1px 0 rgb(255 255 255 / 0.55), 0 6px 14px -12px rgb(15 23 42 / 0.16);
}

.dark {
  --control-bg: rgb(28 28 28 / 0.96);
  --control-bg-strong: rgb(32 32 32 / 0.98);
  --control-secondary-bg: rgb(31 31 31 / 0.95);
  --control-secondary-bg-strong: rgb(36 36 36 / 0.98);
  --control-accent-bg: rgb(36 36 36 / 0.9);
  --control-border: rgb(255 255 255 / 0.075);
  --control-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05), inset 0 -1px 0 rgb(0 0 0 / 0.24), 0 1px 2px rgb(0 0 0 / 0.3);
  --control-shadow-hover: inset 0 1px 0 rgb(255 255 255 / 0.06), 0 10px 18px -16px rgb(0 0 0 / 0.42);
}
```

### Overlay, Table, and Misc Tokens

```css
:root {
  --overlay-surface-bg: var(--surface-elevated-bg);
  --overlay-surface-border: var(--surface-stroke);
  --overlay-surface-shadow: var(--surface-shadow-lg);
  --modal-backdrop: rgb(0 0 0 / 0.44);
  --tooltip-surface-bg: #0f1c2e;
  --tooltip-surface-fg: #f7f9fb;
  --tooltip-surface-border: rgb(15 28 46 / 0.28);
  --tooltip-surface-shadow: 0 14px 28px -16px rgb(15 23 42 / 0.34);
  --table-header-bg: rgb(237 242 247 / 0.4);
  --table-footer-bg: rgb(237 242 247 / 0.65);
  --table-row-hover-bg: rgb(232 244 253 / 0.35);
  --table-row-selected-bg: rgb(240 244 248 / 0.85);
  --empty-surface-bg: var(--surface-soft-bg);
  --empty-surface-shadow: inset 0 1px 0 rgb(255 255 255 / 0.4), 0 1px 1px rgb(15 23 42 / 0.04);
  --alert-surface-bg: color-mix(in srgb, var(--accent) 78%, transparent);
  --alert-surface-shadow: 0 1px 2px rgb(15 23 42 / 0.03), inset 0 1px 0 rgb(255 255 255 / 0.42);
  --alert-destructive-surface-bg: rgb(201 55 44 / 0.08);
  --alert-destructive-surface-shadow: 0 1px 2px rgb(201 55 44 / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.3);
}

.dark {
  --overlay-surface-bg: linear-gradient(180deg, rgb(29 29 29 / 0.99) 0%, rgb(24 24 24 / 1) 100%);
  --overlay-surface-border: rgb(255 255 255 / 0.075);
  --overlay-surface-shadow: 0 26px 56px -28px rgb(0 0 0 / 0.6), 0 10px 24px -20px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.05);
  --modal-backdrop: rgb(0 0 0 / 0.56);
  --tooltip-surface-bg: #202020;
  --tooltip-surface-fg: #ededed;
  --tooltip-surface-border: rgb(255 255 255 / 0.06);
  --tooltip-surface-shadow: 0 18px 32px -18px rgb(0 0 0 / 0.52);
  --table-header-bg: rgb(255 255 255 / 0.03);
  --table-footer-bg: rgb(255 255 255 / 0.05);
  --table-row-hover-bg: rgb(255 255 255 / 0.04);
  --table-row-selected-bg: rgb(255 255 255 / 0.06);
  --empty-surface-bg: linear-gradient(180deg, rgb(24 24 24 / 0.9) 0%, rgb(20 20 20 / 0.98) 100%);
  --empty-surface-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04), 0 1px 1px rgb(0 0 0 / 0.2);
  --alert-surface-bg: rgb(47 159 238 / 0.1);
  --alert-surface-shadow: 0 1px 2px rgb(0 0 0 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.04);
  --alert-destructive-surface-bg: rgb(201 55 44 / 0.12);
  --alert-destructive-surface-shadow: 0 1px 2px rgb(0 0 0 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.04);
}
```

### Motion Tokens

```css
:root {
  --motion-duration-fast: 160ms;
  --motion-duration-base: 220ms;
  --motion-duration-slow: 320ms;
  --motion-ease-standard: cubic-bezier(0.25, 1, 0.5, 1);
  --motion-ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
  --motion-lift-distance: 2px;
}
```

---

## Tailwind Theme Inline Block

Add this to your `globals.css` after the imports:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
```

---

## Typography

| Role | Classes |
| --- | --- |
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

## Spacing & Radius Rules

- Use `gap-2` to `gap-3` for tight control groups
- Use `gap-4` to `gap-6` for card bodies and form sections
- Use `gap-6` to `gap-8` for page sections
- Controls: `rounded-lg`
- Cards, tables, sections: `rounded-xl`
- Large overlays: `rounded-2xl`

---

## Utility Classes to Add to globals.css

These are the shared surface and control utility classes that make the system work:

```css
@layer utilities {
  .surface-card {
    border: 1px solid var(--surface-stroke);
    background: var(--surface-elevated-bg);
    box-shadow: var(--surface-card-shadow);
  }

  .surface-card-footer {
    background: var(--surface-footer-bg);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
  }

  .control-surface {
    border-color: var(--control-border);
    background: var(--control-bg);
    box-shadow: var(--control-shadow);
  }

  .control-surface-secondary {
    border-color: color-mix(in srgb, var(--control-border) 82%, transparent);
    background: var(--control-secondary-bg);
    box-shadow: var(--control-shadow);
  }

  .control-ghost-surface {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .overlay-surface {
    background: var(--overlay-surface-bg);
    border-color: var(--overlay-surface-border);
    box-shadow: var(--overlay-surface-shadow);
  }

  .modal-backdrop {
    background: var(--modal-backdrop);
  }

  .tooltip-surface {
    background: var(--tooltip-surface-bg);
    color: var(--tooltip-surface-fg);
    border: 1px solid var(--tooltip-surface-border);
    box-shadow: var(--tooltip-surface-shadow);
  }

  .table-head-surface {
    background: var(--table-header-bg);
  }

  .table-foot-surface {
    background: var(--table-footer-bg);
  }

  .table-row-surface {
    transition: background-color 150ms ease;
  }

  .table-row-surface:hover,
  .table-row-surface:focus-within {
    background: var(--table-row-hover-bg);
  }

  .table-row-surface[data-state="selected"] {
    background: var(--table-row-selected-bg);
  }

  .empty-surface {
    background: var(--empty-surface-bg);
    box-shadow: var(--empty-surface-shadow);
  }

  .alert-surface {
    background: var(--alert-surface-bg);
    box-shadow: var(--alert-surface-shadow);
  }

  .alert-destructive-surface {
    background: var(--alert-destructive-surface-bg);
    box-shadow: var(--alert-destructive-surface-shadow);
  }

  .hero-panel {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-xl);
    border: 1px solid var(--surface-stroke);
    background: var(--surface-elevated-bg);
    box-shadow: var(--surface-shadow-lg);
  }

  .section-panel {
    border-radius: var(--radius-xl);
    border: 1px solid var(--surface-stroke);
    background: var(--surface-elevated-bg);
    box-shadow: var(--surface-shadow-lg);
  }

  .soft-panel {
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--surface-stroke) 88%, transparent);
    background: var(--surface-muted-bg);
    box-shadow: var(--surface-shadow-sm);
  }

  .meta-label {
    font-size: 0.68rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted-foreground);
  }

  .eyebrow {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    background: var(--secondary);
    padding: 0.25rem 0.625rem;
    font-size: 0.68rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted-foreground);
  }

  .motion-transition {
    transition-property: transform, opacity, background-color, border-color, box-shadow, color;
    transition-duration: var(--motion-duration-fast);
    transition-timing-function: var(--motion-ease-standard);
  }

  .motion-lift {
    transition-property: transform, background-color, border-color, box-shadow, color;
    transition-duration: var(--motion-duration-fast);
    transition-timing-function: var(--motion-ease-standard);
  }
}

@media (hover: hover) and (pointer: fine) {
  .motion-lift:hover {
    transform: translate3d(0, calc(var(--motion-lift-distance) * -1), 0);
  }
}
```

---

## shadcn/ui Component Customizations

### Button

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

Key customizations:
- `default` variant uses a custom `.button-primary-fixed` class with inset highlights, bottom edge darkening, and deep colored shadow. Uses hardcoded `#2f9fee` for the background and `rgb(47 159 238 / 0.38)` for the glow shadow. Lifts `-translate-y-px` on hover.
- `outline` uses `control-surface` with hover to `--control-bg-strong` and `--control-shadow-hover`.
- `ghost` uses `control-ghost-surface` (transparent bg/border) with hover revealing `--control-accent-bg`.
- `destructive` uses `.button-destructive-fixed` with red inset highlights and colored shadow.
- All buttons include `group/button`, `shrink-0`, `select-none`, `transition-[background-color,border-color,color,box-shadow,transform] duration-150`.
- Focus: `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15`.

#### button-primary-fixed CSS

```css
.button-primary-fixed {
  border-color: color-mix(in srgb, #2f9fee 85%, white);
  background: #2f9fee;
  color: #f0f9ff;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    inset 0 -1px 0 rgb(10 40 80 / 0.16),
    0 1px 2px rgb(15 23 42 / 0.08),
    0 10px 18px -14px rgb(47 159 238 / 0.38);
}

.button-primary-fixed:hover {
  background: color-mix(in srgb, #2f9fee 95%, white);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    inset 0 -1px 0 rgb(10 40 80 / 0.2),
    0 1px 2px rgb(15 23 42 / 0.08),
    0 14px 24px -16px rgb(47 159 238 / 0.42);
}

.dark .button-primary-fixed {
  border-color: color-mix(in srgb, #2f9fee 76%, black);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.07),
    inset 0 -1px 0 rgb(10 40 80 / 0.34),
    0 1px 2px rgb(0 0 0 / 0.32),
    0 10px 18px -14px rgb(47 159 238 / 0.18);
}

.dark .button-primary-fixed:hover {
  background: color-mix(in srgb, #2f9fee 94%, black);
  border-color: color-mix(in srgb, #2f9fee 80%, black);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.09),
    inset 0 -1px 0 rgb(10 40 80 / 0.38),
    0 1px 2px rgb(0 0 0 / 0.34),
    0 14px 24px -16px rgb(47 159 238 / 0.22);
}
```

### Input

Key customizations:
- Uses `control-surface` class for background/border/shadow.
- Height: `h-10`, border: `border-input/95`, radius: `rounded-lg`.
- Focus: `focus-visible:border-ring focus-visible:bg-[var(--control-bg-strong)] focus-visible:ring-4 focus-visible:ring-ring/15`.
- Error: `aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10`.

### Card

Key customizations:
- Uses `surface-card` utility class (gradient bg, inset highlights, layered shadow).
- Rounded: `rounded-xl`.
- Footer uses `surface-card-footer` class with `border-t border-border/75`.
- Supports `size="sm"` prop for compact cards.
- Default gap: `gap-5`, padding: `px-4 pt-4 sm:px-6 sm:pt-6`.

### Badge

Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`

Key customizations:
- `default`: primary bg with `shadow-[var(--control-primary-shadow)]`.
- `secondary`: uses `control-surface-secondary`.
- `destructive`: transparent bg with `bg-destructive/10 text-destructive`.
- `outline`: uses `control-surface`.
- Height: `h-6`, padding: `px-2.5`, radius: `rounded-md`.

### Dialog / Sheet

- Use `overlay-surface` class on content panels.
- Backdrop uses `modal-backdrop` class.
- Content rounded: `rounded-2xl`.

### Table

- Header: `table-head-surface` class.
- Rows: `table-row-surface` class (hover and selected states via tokens).
- Wrap in a `dashboard-table-shell` container (border + surface-elevated-bg + shadow-lg).

---

## Base Layer

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    @apply bg-background font-sans;
    scrollbar-gutter: stable;
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: rgb(212 220 230 / 0.5) transparent;
  }

  body {
    @apply min-h-screen bg-background text-foreground;
    background-image: linear-gradient(180deg, #ffffff 0%, #f8fafb 42%, #f3f6fa 100%);
  }

  .dark body {
    background-image: linear-gradient(180deg, #161616 0%, #121212 42%, #0d0d0d 100%);
  }

  ::selection {
    background-color: color-mix(in srgb, var(--color-primary) 22%, white);
  }

  button:not(:disabled) { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
}
```

---

## Sidebar Architecture

The sidebar is the primary navigation shell. It uses a provider-based context pattern with CSS variable sizing.

### Sidebar Tokens

Include these in both `:root` and `.dark`:

```css
:root {
  --sidebar: #f6f8fb;
  --sidebar-foreground: #0f1c2e;
  --sidebar-primary: #2f9fee;
  --sidebar-primary-foreground: #f0f9ff;
  --sidebar-accent: #edf2f7;
  --sidebar-accent-foreground: #0c2d44;
  --sidebar-border: #d5dde7;
  --sidebar-ring: #4db5ff;
}

.dark {
  --sidebar: #161616;
  --sidebar-foreground: #ededed;
  --sidebar-primary: #2f9fee;
  --sidebar-primary-foreground: #f0f9ff;
  --sidebar-accent: #202020;
  --sidebar-accent-foreground: #ededed;
  --sidebar-border: rgb(255 255 255 / 0.06);
  --sidebar-ring: #4db5ff;
}
```

### Tailwind Theme Mapping for Sidebar

```css
@theme inline {
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
}
```

### Sidebar Dimensions

```
--sidebar-width: 17.5rem (expanded)
--sidebar-width-icon: 4.25rem (collapsed/icon mode)
--sidebar-width-mobile: 18rem (mobile sheet)
```

### How It Works

1. **SidebarProvider** wraps the entire layout. It manages `expanded`/`collapsed` state via React context, persists to a cookie (`sidebar_state`), and listens for `Cmd/Ctrl+B` keyboard shortcut.

2. **Sidebar** renders differently based on viewport:
   - Desktop: Fixed-position panel on the left with animated width transitions. Supports `collapsible="icon"` (shrinks to icon strip) or `collapsible="offcanvas"` (slides off-screen).
   - Mobile: Renders inside a Sheet overlay (slides in from left).

3. **SidebarInset** is the main content area. It's a `<main>` that flexes to fill the remaining viewport width beside the sidebar.

4. **Layout Structure:**

```tsx
<SidebarProvider defaultOpen style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" }}>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      {/* Brand mark + business/workspace switcher */}
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {navigation.map(item => (
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
    <SidebarFooter>
      {/* User menu dropdown */}
    </SidebarFooter>
    <SidebarRail /> {/* Drag/click rail to toggle */}
  </Sidebar>

  <SidebarInset>
    <header className="dashboard-topbar">
      {/* Topbar: SidebarTrigger + breadcrumbs + actions */}
    </header>
    <main className="dashboard-main">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

### Active Navigation Item Styling

```tsx
<SidebarMenuButton
  className="min-h-10 rounded-lg border border-transparent px-3 py-2
    data-[active=true]:border-sidebar-primary/12
    data-[active=true]:bg-sidebar-primary/12
    data-[active=true]:text-primary
    data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]
    dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
  isActive={isActive}
  tooltip={item.label}
>
```

### SidebarMenuButton Variants

```
variant: "default" | "outline"
size: "default" (h-10) | "sm" (h-8) | "lg" (h-12)
```

Default variant: hover uses `bg-sidebar-accent text-sidebar-accent-foreground`.

### Collapsed (Icon) Mode Behavior

When collapsed to icon mode (`group-data-[collapsible=icon]`):
- Labels (`span`) are hidden
- Menu buttons become `size-10` squares centered
- Group labels get `-mt-8 opacity-0`
- Sidebar content `overflow-hidden`
- Tooltips appear on hover (rendered via `SidebarMenuButton tooltip` prop)

### Dashboard Topbar (inside SidebarInset)

```css
.dashboard-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--background) 90%, transparent);
  backdrop-filter: blur(12px);
}
```

Contains: `SidebarTrigger` (toggle button), breadcrumbs, command palette, notification bell, and upgrade CTA.

### Motion for Sidebar

```css
.motion-sidebar-panel {
  transition-duration: var(--motion-duration-base);
  transition-timing-function: var(--motion-ease-standard);
}
```

Applied to sidebar gap, container, rail, group labels, and menu actions for smooth expand/collapse transitions.

---

## Implementation Prompt

Use this prompt with an AI assistant to implement the design system in your other app:

---

### PROMPT

```
I want you to implement a complete design system overhaul of this app. Here is the full design specification — implement everything including the primary color and sidebar. Refer to DESIGN-EXPORT.md for the complete token values, utility class definitions, and sidebar architecture.

## What to do:

1. **globals.css**: Replace the entire CSS file with the token system from the DESIGN-EXPORT.md document. Include ALL tokens: primary (#2f9fee), surface, control, overlay, table, empty, alert, motion, AND sidebar tokens for both light and dark modes. Add the @theme inline block, base layer, and all utility classes.

2. **shadcn/ui components**: Update ALL shadcn components to match the customization patterns:
   - Button: Add `button-primary-fixed` and `button-destructive-fixed` CSS classes. Update variants to use `control-surface`, `control-ghost-surface`, `control-surface-secondary` classes. Add lift effect on primary/destructive hover.
   - Input: Add `control-surface` class, update focus ring to `ring-4 ring-ring/15`, error state to `aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10`.
   - Card: Add `surface-card` class, gradient background, inset highlights, layered shadow. Add `surface-card-footer` to CardFooter.
   - Badge: Update all variants to use control surface classes and token-based shadows.
   - Dialog/Sheet: Use `overlay-surface` on content, `modal-backdrop` on overlay.
   - Table: Use `table-head-surface`, `table-row-surface` classes.
   - Tooltip: Use `tooltip-surface` class.
   - Alert: Use `alert-surface` and `alert-destructive-surface` classes.
   - Sidebar: Use the full sidebar token system (sidebar, sidebar-foreground, sidebar-primary, sidebar-accent, sidebar-border, sidebar-ring). See the Sidebar Architecture section.
   - Tabs: Keep clean, minimal line or pill style.

3. **Sidebar Layout**: Implement the sidebar-based dashboard shell using the SidebarProvider pattern from DESIGN-EXPORT.md. The sidebar:
   - Uses a `SidebarProvider` wrapper with CSS variable sizing (`--sidebar-width: 17.5rem`, `--sidebar-width-icon: 4.25rem`)
   - Has collapsible states: `expanded` and `collapsed` (icon mode)
   - On mobile, renders as a Sheet overlay
   - Persists state via cookie (`sidebar_state`)
   - Keyboard shortcut: Cmd/Ctrl+B toggles
   - Contains: SidebarHeader (brand + business switcher), SidebarContent (navigation), SidebarFooter (user menu)
   - Active nav items get `border-sidebar-primary/12 bg-sidebar-primary/12 text-primary` styling
   - The main content area uses `SidebarInset` which flexes to fill remaining space

4. **Body gradient**: Light mode body gets `linear-gradient(180deg, #ffffff 0%, #f8fafb 42%, #f3f6fa 100%)`. Dark mode gets `linear-gradient(180deg, #161616 0%, #121212 42%, #0d0d0d 100%)`.

5. **Font**: Use Geist Sans as the primary font and Geist Mono for code. Set `--font-heading` to the same sans font.

6. **Radius**: Set `--radius: 0.75rem`. Controls use rounded-lg, cards/sections use rounded-xl, large overlays use rounded-2xl.

7. **Motion**: Add motion tokens (--motion-duration-fast: 160ms, --motion-duration-base: 220ms, --motion-duration-slow: 320ms) and utility classes (motion-transition, motion-lift, motion-sidebar-panel). Keep motion subtle.

8. **Scrollbar**: Style scrollbars to be thin and subtle. Use `scrollbar-gutter: stable` on html.

9. **Accessibility**: Maintain visible focus rings (ring-4 with ring-ring/15), aria-invalid states, disabled opacity, and proper contrast ratios.

## Design philosophy:
- Calm, modern, minimalist, polished, practical
- Layered surfaces with subtle gradient backgrounds and inset highlights
- Deep, diffuse shadows that create depth without heaviness
- Semantic tokens everywhere — no raw palette colors in components
- Everything looks great in both light and dark mode
- Sidebar is a persistent navigation shell, not a page-by-page element

## Do NOT:
- Add raw palette utilities (text-emerald-*, bg-amber-*, etc.)
- Use space-y-* (prefer gap-*)
- Add flashy animations or decorative motion
- Over-engineer — keep it maintainable

Refer to DESIGN-EXPORT.md for the complete token values and utility class definitions.
```

---

## Checklist

- [ ] globals.css fully replaced with token system
- [ ] All CSS custom properties defined for :root and .dark (including primary #2f9fee)
- [ ] Sidebar tokens (sidebar, sidebar-foreground, sidebar-primary, sidebar-accent, sidebar-border, sidebar-ring) in both modes
- [ ] Surface tokens (elevated, soft, muted, stroke, shadows) in both modes
- [ ] Control tokens (bg, border, shadow, hover) in both modes
- [ ] Overlay, table, tooltip, empty, alert tokens in both modes
- [ ] Motion tokens defined
- [ ] @theme inline block with all Tailwind mappings including sidebar colors
- [ ] Base layer with border-border, scrollbar, body gradient, selection
- [ ] Utility classes: surface-card, control-surface, overlay-surface, motion-sidebar-panel, etc.
- [ ] Button component updated with all variants and sizes
- [ ] Input component updated with control-surface and focus states
- [ ] Card component updated with surface-card class
- [ ] Badge component updated with token-based variants
- [ ] Dialog/Sheet using overlay-surface
- [ ] Table using table surface classes
- [ ] Tooltip using tooltip-surface
- [ ] Alert using alert surface classes
- [ ] Sidebar component installed with full provider/context pattern
- [ ] Sidebar supports expanded/collapsed/icon states
- [ ] Sidebar mobile renders as Sheet
- [ ] SidebarInset used as main content wrapper
- [ ] Dashboard topbar (sticky, blur backdrop, breadcrumbs, trigger)
- [ ] Active nav items styled with primary/12 background
- [ ] Collapsed mode shows icons only with tooltips
- [ ] Cookie persistence for sidebar state
- [ ] Keyboard shortcut (Cmd/Ctrl+B) toggles sidebar
- [ ] Geist font configured
- [ ] Dark mode fully working
- [ ] Reduced motion media query respected
