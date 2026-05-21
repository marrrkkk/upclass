# Implementation Plan: Design System Overhaul

## Overview

Replace the existing oklch-based token system with a comprehensive semantic token architecture built around #2f9fee primary blue. Update all shadcn/ui components to consume tokens via utility classes. Introduce a sidebar-based dashboard layout shell. All exact token values, utility class definitions, and component specifications are in DESIGN-EXPORT.md.

## Tasks

- [x] 1. Replace globals.css with the complete token system
  - [x] 1.1 Replace all CSS custom properties in :root with hex values from DESIGN-EXPORT.md (core colors, surface, control, overlay, table, alert, tooltip, motion, sidebar tokens)
    - Set --radius to 0.75rem
    - Set --primary to #2f9fee and all derived tokens per DESIGN-EXPORT.md
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.10_
  - [x] 1.2 Replace all .dark selector tokens with dark mode values from DESIGN-EXPORT.md
    - _Requirements: 1.2, 13.1_
  - [x] 1.3 Update the @theme inline block with Tailwind v4 mappings from DESIGN-EXPORT.md
    - Include font mappings: --font-sans to var(--font-geist-sans), --font-mono to var(--font-geist-mono)
    - Include radius scale using multipliers (0.6, 0.8, 1.0, 1.4, 1.8, 2.2, 2.6)
    - Include all color mappings and chart colors
    - _Requirements: 1.6, 1.10, 12.3_
  - [x] 1.4 Update @layer base with border-border, scrollbar styling, body gradient, selection highlight, and button cursor rules from DESIGN-EXPORT.md
    - html: scrollbar-gutter stable, scrollbar-width thin, scrollbar-color
    - body: min-h-screen, background-image gradient for light mode
    - .dark body: dark gradient
    - ::selection with primary color mix
    - _Requirements: 1.7, 13.2, 13.3_
  - [x] 1.5 Add all utility classes in @layer utilities from DESIGN-EXPORT.md
    - surface-card, surface-card-footer, control-surface, control-surface-secondary, control-ghost-surface
    - overlay-surface, modal-backdrop, tooltip-surface
    - table-head-surface, table-foot-surface, table-row-surface (with hover/focus-within/selected states)
    - empty-surface, alert-surface, alert-destructive-surface
    - hero-panel, section-panel, soft-panel
    - meta-label, eyebrow
    - motion-transition, motion-lift (with @media hover query)
    - _Requirements: 1.8_
  - [x] 1.6 Add button-primary-fixed and button-destructive-fixed CSS classes from DESIGN-EXPORT.md
    - Include light mode, hover, .dark, and .dark hover variants
    - _Requirements: 1.9_
  - [x] 1.7 Ensure @custom-variant dark (&:is(.dark *)) is preserved
    - _Requirements: 13.4_

- [x] 2. Update Button component
  - [x] 2.1 Update Button variants using CVA to match DESIGN-EXPORT.md
    - default: button-primary-fixed class, hover:-translate-y-px for lift
    - outline: control-surface, hover:bg-[var(--control-bg-strong)] hover:shadow-[var(--control-shadow-hover)]
    - secondary: control-surface-secondary
    - ghost: control-ghost-surface, hover:bg-[var(--control-accent-bg)]
    - destructive: button-destructive-fixed class, hover:-translate-y-px for lift
    - link: transparent, underline-offset-4 hover:underline
    - Base classes: group/button shrink-0 select-none, transition-[background-color,border-color,color,box-shadow,transform] duration-150
    - Focus: focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_
  - [x] 2.2 Update Button sizes to match DESIGN-EXPORT.md
    - default: h-9 px-4 py-2
    - xs: h-7 px-2.5 text-xs rounded-md
    - sm: h-8 px-3 text-sm rounded-md
    - lg: h-11 px-6 text-base rounded-lg
    - icon: size-9
    - icon-xs: size-7
    - icon-sm: size-8
    - icon-lg: size-11
    - _Requirements: 2.6_
  - [ ]* 2.3 Write property test for Button variant-to-class mapping
    - **Property 1: Button variant-to-class mapping consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 3. Update Input component
  - [x] 3.1 Update Input to use control-surface class, h-10, rounded-lg, focus ring, and aria-invalid states per DESIGN-EXPORT.md
    - Add: control-surface class
    - Focus: focus-visible:border-ring focus-visible:bg-[var(--control-bg-strong)] focus-visible:ring-4 focus-visible:ring-ring/15
    - Error: aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Update Card component
  - [x] 4.1 Update Card to use surface-card class, rounded-xl, and support size prop per DESIGN-EXPORT.md
    - Card: surface-card rounded-xl
    - CardFooter: surface-card-footer border-t border-border/75
    - Add size="sm" prop for compact padding
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Update Badge component
  - [x] 5.1 Update Badge variants to use token-based classes per DESIGN-EXPORT.md
    - default: primary bg with control-primary-shadow
    - secondary: control-surface-secondary
    - destructive: bg-destructive/10 text-destructive
    - outline: control-surface
    - Base: h-6 px-2.5 rounded-md
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Update Dialog and Sheet components
  - [x] 6.1 Update Dialog content to use overlay-surface class, rounded-2xl, and modal-backdrop on overlay
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 6.2 Update Sheet content to use overlay-surface class and modal-backdrop on overlay
    - _Requirements: 6.4, 6.5_

- [x] 7. Create/update Table component
  - [x] 7.1 Update Table component with table-head-surface on header, table-row-surface on rows, and container wrapper per DESIGN-EXPORT.md
    - TableHeader: table-head-surface
    - TableRow: table-row-surface
    - Wrap in container with border + surface-elevated-bg + shadow-lg
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Update Tooltip component
  - [x] 8.1 Update TooltipContent to apply tooltip-surface class per DESIGN-EXPORT.md
    - _Requirements: 8.1_

- [x] 9. Update Alert component
  - [x] 9.1 Update Alert variants to use alert-surface and alert-destructive-surface classes per DESIGN-EXPORT.md
    - default: alert-surface
    - destructive: alert-destructive-surface
    - _Requirements: 9.1, 9.2_

- [x] 10. Checkpoint - Verify token system and component updates
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the app builds without errors: `npm run build`
  - Visually inspect light and dark modes

- [x] 11. Install and create Sidebar component with full provider pattern
  - [x] 11.1 Install shadcn sidebar component via CLI or create from DESIGN-EXPORT.md specification
    - SidebarProvider with context (expanded/collapsed state)
    - Cookie persistence (sidebar_state cookie)
    - Cmd/Ctrl+B keyboard shortcut
    - collapsible="icon" mode (collapses to 4.25rem icon strip)
    - Mobile Sheet rendering
    - SidebarInset as main content wrapper
    - SidebarRail for drag/click toggle
    - Include all sub-components: SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 11.2 Style active navigation items with primary/12 background per DESIGN-EXPORT.md
    - data-[active=true]:border-sidebar-primary/12 bg-sidebar-primary/12 text-primary
    - Inset shadow for light and dark modes
    - _Requirements: 10.7_

- [x] 12. Create dashboard layout shell
  - [x] 12.1 Create or update app/(main)/layout.tsx to use the Dashboard_Shell pattern from DESIGN-EXPORT.md
    - Wrap in SidebarProvider with style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" }}
    - Render Sidebar with collapsible="icon"
    - Render SidebarInset containing sticky topbar and children
    - Topbar: sticky top-0 z-30, border-bottom with 70% border opacity, bg with 90% opacity + backdrop-blur-[12px]
    - Include SidebarTrigger in topbar
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13. Configure Geist fonts in root layout
  - [x] 13.1 Install geist package and configure Geist Sans + Geist Mono via next/font in app/layout.tsx
    - Import and instantiate both fonts
    - Apply CSS variable classes to html/body element
    - Ensure --font-geist-sans and --font-geist-mono are available
    - _Requirements: 12.1, 12.2_

- [x] 14. Final checkpoint - Full build and visual verification
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` to verify no type or build errors
  - Verify light and dark mode rendering
  - Verify sidebar expand/collapse and mobile behavior

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Task 1 (globals.css) MUST be completed first as all other tasks depend on the token system
- Tasks 2-9 can be executed in any order after task 1
- Tasks 11-12 (sidebar/layout) depend on task 1 but are independent of tasks 2-9
- Task 13 (fonts) can be done at any point but ideally early since @theme references font variables
- All exact token values, CSS class definitions, and component specifications are in DESIGN-EXPORT.md - reference it during implementation
