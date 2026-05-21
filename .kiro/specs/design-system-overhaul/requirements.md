# Requirements Document

## Introduction

This document defines the requirements for a complete design system overhaul of the UpClass Next.js application. The overhaul replaces the existing oklch-based token system with a comprehensive semantic token architecture built around primary blue `#2f9fee`, updates all shadcn/ui components to consume the new tokens via utility classes, and introduces a sidebar-based dashboard layout shell.

## Glossary

- **Token_System**: The set of CSS custom properties defined in globals.css that provide all color, surface, control, overlay, motion, and spacing values for both light and dark modes
- **Surface_Class**: A CSS utility class that applies background, border, and box-shadow from surface tokens in a single declaration
- **Control_Surface**: A CSS utility class for form controls (inputs, selects, buttons) providing background, border-color, and box-shadow from control tokens
- **Overlay_Surface**: A CSS utility class for modals, dialogs, and sheets providing elevated background, border, and shadow
- **Button_Component**: The shadcn/ui Button primitive with CVA-based variants
- **Input_Component**: The shadcn/ui Input primitive for form fields
- **Card_Component**: The shadcn/ui Card primitive for content containers
- **Badge_Component**: The shadcn/ui Badge primitive for status labels
- **Dialog_Component**: The shadcn/ui Dialog primitive for modal overlays
- **Sheet_Component**: The shadcn/ui Sheet primitive for slide-in panels
- **Table_Component**: The shadcn/ui Table primitive for tabular data
- **Tooltip_Component**: The shadcn/ui Tooltip primitive for contextual hints
- **Alert_Component**: The shadcn/ui Alert primitive for informational messages
- **Sidebar_Component**: The shadcn/ui Sidebar component with SidebarProvider context pattern
- **SidebarInset**: The main content wrapper that fills remaining viewport width beside the Sidebar
- **Dashboard_Shell**: The layout combining SidebarProvider, Sidebar, SidebarInset, and a sticky topbar

## Requirements

### Requirement 1: Token System and globals.css

**User Story:** As a developer, I want a complete CSS custom property token system in globals.css, so that all UI components consume consistent, theme-aware design values.

#### Acceptance Criteria

1. THE Token_System SHALL define all core color tokens (--background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --border, --input, --ring, --radius) in :root with hex values derived from primary #2f9fee
2. THE Token_System SHALL define matching dark mode values for all core color tokens within a .dark selector
3. THE Token_System SHALL define surface tokens (--surface-elevated-bg, --surface-soft-bg, --surface-muted-bg, --surface-stroke, --surface-shadow-lg, --surface-card-shadow, --surface-shadow-md, --surface-shadow-sm, --surface-footer-bg) in both :root and .dark
4. THE Token_System SHALL define control tokens (--control-bg, --control-bg-strong, --control-secondary-bg, --control-secondary-bg-strong, --control-accent-bg, --control-border, --control-shadow, --control-shadow-hover) in both :root and .dark
5. THE Token_System SHALL define overlay tokens (--overlay-surface-bg, --overlay-surface-border, --overlay-surface-shadow, --modal-backdrop), tooltip tokens (--tooltip-surface-bg, --tooltip-surface-fg, --tooltip-surface-border, --tooltip-surface-shadow), table tokens (--table-header-bg, --table-footer-bg, --table-row-hover-bg, --table-row-selected-bg), alert tokens (--alert-surface-bg, --alert-surface-shadow, --alert-destructive-surface-bg, --alert-destructive-surface-shadow), and motion tokens (--motion-duration-fast, --motion-duration-base, --motion-duration-slow, --motion-ease-standard, --motion-ease-emphasized, --motion-lift-distance) in both :root and .dark
6. THE Token_System SHALL include a @theme inline block mapping CSS custom properties to Tailwind v4 theme values for colors, fonts, and radius scales
7. THE Token_System SHALL include a @layer base block that applies border-border to all elements, sets html scrollbar-gutter to stable with thin scrollbar-width, and applies body background gradient for both light and dark modes
8. THE Token_System SHALL define utility classes in @layer utilities: surface-card, surface-card-footer, control-surface, control-surface-secondary, control-ghost-surface, overlay-surface, modal-backdrop, tooltip-surface, table-head-surface, table-foot-surface, table-row-surface, empty-surface, alert-surface, alert-destructive-surface, hero-panel, section-panel, soft-panel, meta-label, eyebrow, motion-transition, motion-lift
9. THE Token_System SHALL define button-primary-fixed and button-destructive-fixed CSS classes with hardcoded primary/destructive colors, inset highlights, bottom edge darkening, and deep colored shadows for both light and dark modes
10. THE Token_System SHALL set --radius to 0.75rem and derive radius scale values (--radius-sm through --radius-4xl) using multipliers in the @theme inline block

### Requirement 2: Button Component Update

**User Story:** As a developer, I want the Button component to use the new token-based variants, so that buttons are visually consistent with the design system.

#### Acceptance Criteria

1. WHEN the variant is "default", THE Button_Component SHALL apply the button-primary-fixed CSS class and translate-y on hover for a lift effect
2. WHEN the variant is "outline", THE Button_Component SHALL apply the control-surface class with hover transitioning to --control-bg-strong background and --control-shadow-hover shadow
3. WHEN the variant is "secondary", THE Button_Component SHALL apply the control-surface-secondary class
4. WHEN the variant is "ghost", THE Button_Component SHALL apply the control-ghost-surface class with hover revealing --control-accent-bg background
5. WHEN the variant is "destructive", THE Button_Component SHALL apply the button-destructive-fixed CSS class and translate-y on hover for a lift effect
6. THE Button_Component SHALL support sizes: default (h-9 px-4 py-2), xs (h-7 px-2.5), sm (h-8 px-3), lg (h-11 px-6), icon (size-9), icon-xs (size-7), icon-sm (size-8), icon-lg (size-11)
7. THE Button_Component SHALL apply focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 for keyboard focus states
8. THE Button_Component SHALL include group/button, shrink-0, and select-none in base classes

### Requirement 3: Input Component Update

**User Story:** As a developer, I want the Input component to use control-surface styling, so that form inputs are consistent with the token system.

#### Acceptance Criteria

1. THE Input_Component SHALL apply the control-surface class for background, border-color, and box-shadow
2. THE Input_Component SHALL have height h-10 and border-radius rounded-lg
3. WHEN the Input_Component receives keyboard focus, THE Input_Component SHALL apply focus-visible:border-ring, focus-visible:bg-[var(--control-bg-strong)], focus-visible:ring-4, and focus-visible:ring-ring/15
4. WHEN the Input_Component has aria-invalid="true", THE Input_Component SHALL apply aria-invalid:border-destructive and aria-invalid:ring-4 aria-invalid:ring-destructive/10

### Requirement 4: Card Component Update

**User Story:** As a developer, I want the Card component to use the surface-card utility, so that cards have the layered glass-like appearance defined in the design system.

#### Acceptance Criteria

1. THE Card_Component SHALL apply the surface-card utility class providing gradient background, inset highlights, and layered shadow
2. THE Card_Component SHALL use rounded-xl border-radius
3. WHEN a CardFooter is rendered, THE Card_Component SHALL apply the surface-card-footer class with border-t border-border/75
4. WHERE a size="sm" prop is provided, THE Card_Component SHALL apply compact padding values

### Requirement 5: Badge Component Update

**User Story:** As a developer, I want Badge variants to use token-based styling, so that badges are consistent with the control surface system.

#### Acceptance Criteria

1. WHEN the variant is "default", THE Badge_Component SHALL apply primary background with token-based shadow
2. WHEN the variant is "secondary", THE Badge_Component SHALL apply the control-surface-secondary class
3. WHEN the variant is "destructive", THE Badge_Component SHALL apply bg-destructive/10 with text-destructive color
4. WHEN the variant is "outline", THE Badge_Component SHALL apply the control-surface class
5. THE Badge_Component SHALL have height h-6, padding px-2.5, and border-radius rounded-md

### Requirement 6: Dialog and Sheet Overlay Update

**User Story:** As a developer, I want Dialog and Sheet components to use overlay-surface tokens, so that modal overlays have consistent elevated styling.

#### Acceptance Criteria

1. THE Dialog_Component content panel SHALL apply the overlay-surface class for background, border, and shadow
2. THE Dialog_Component overlay backdrop SHALL apply the modal-backdrop class
3. THE Dialog_Component content SHALL use rounded-2xl border-radius
4. THE Sheet_Component content panel SHALL apply the overlay-surface class for background, border, and shadow
5. THE Sheet_Component overlay backdrop SHALL apply the modal-backdrop class

### Requirement 7: Table Component

**User Story:** As a developer, I want a Table component using table surface tokens, so that data tables have consistent header, hover, and selection styling.

#### Acceptance Criteria

1. THE Table_Component header SHALL apply the table-head-surface class
2. THE Table_Component body rows SHALL apply the table-row-surface class providing hover and focus-within background transitions
3. WHEN a table row has data-state="selected", THE Table_Component SHALL apply --table-row-selected-bg background
4. THE Table_Component SHALL be wrapped in a container with surface-elevated-bg and border styling

### Requirement 8: Tooltip Component Update

**User Story:** As a developer, I want Tooltip to use the tooltip-surface class, so that tooltips have the dark inverted styling from the token system.

#### Acceptance Criteria

1. THE Tooltip_Component content SHALL apply the tooltip-surface class providing background, foreground color, border, and shadow from tooltip tokens

### Requirement 9: Alert Component Update

**User Story:** As a developer, I want Alert to use alert surface classes, so that informational and destructive alerts have token-based backgrounds and shadows.

#### Acceptance Criteria

1. WHEN the variant is "default", THE Alert_Component SHALL apply the alert-surface class
2. WHEN the variant is "destructive", THE Alert_Component SHALL apply the alert-destructive-surface class

### Requirement 10: Sidebar Component

**User Story:** As a developer, I want a full sidebar component using the provider pattern with collapsible states, so that the app has a consistent navigation shell with keyboard shortcuts and mobile support.

#### Acceptance Criteria

1. THE Sidebar_Component SHALL use a SidebarProvider context that manages expanded/collapsed state
2. THE Sidebar_Component SHALL persist its open/closed state via a cookie named "sidebar_state"
3. WHEN the user presses Cmd/Ctrl+B, THE Sidebar_Component SHALL toggle between expanded and collapsed states
4. WHEN collapsible is set to "icon", THE Sidebar_Component SHALL collapse to a --sidebar-width-icon (4.25rem) strip showing only icons
5. WHEN the viewport is mobile-sized, THE Sidebar_Component SHALL render inside a Sheet overlay sliding from the left
6. THE Sidebar_Component SHALL use sidebar tokens (--sidebar, --sidebar-foreground, --sidebar-primary, --sidebar-accent, --sidebar-border, --sidebar-ring) for all its styling
7. WHEN a navigation item is active, THE Sidebar_Component SHALL apply border-sidebar-primary/12, bg-sidebar-primary/12, and text-primary styling to that item

### Requirement 11: Dashboard Layout Shell

**User Story:** As a developer, I want a dashboard layout shell integrating the sidebar into the (main) layout, so that authenticated pages share a consistent navigation and content structure.

#### Acceptance Criteria

1. THE Dashboard_Shell SHALL wrap its children in SidebarProvider with CSS variable sizing (--sidebar-width: 17.5rem, --sidebar-width-icon: 4.25rem)
2. THE Dashboard_Shell SHALL render a Sidebar with collapsible="icon" containing SidebarHeader, SidebarContent with navigation menu, and SidebarFooter
3. THE Dashboard_Shell SHALL render SidebarInset as the main content wrapper that flexes to fill remaining viewport width
4. THE Dashboard_Shell SHALL include a sticky topbar inside SidebarInset with blur backdrop, border-bottom, and containing a SidebarTrigger
5. THE Dashboard_Shell SHALL replace or integrate with the existing (main) layout.tsx

### Requirement 12: Font Configuration

**User Story:** As a developer, I want Geist Sans and Geist Mono configured via next/font, so that the app uses the design system's specified typefaces.

#### Acceptance Criteria

1. THE Font configuration SHALL load Geist Sans via next/font and expose it as --font-geist-sans CSS variable
2. THE Font configuration SHALL load Geist Mono via next/font and expose it as --font-geist-mono CSS variable
3. THE @theme inline block SHALL map --font-sans to var(--font-geist-sans) and --font-mono to var(--font-geist-mono)

### Requirement 13: Dark Mode Support

**User Story:** As a developer, I want all tokens to have dark mode equivalents, so that the entire UI adapts correctly when dark mode is active.

#### Acceptance Criteria

1. THE Token_System SHALL define all color, surface, control, overlay, table, alert, and tooltip tokens within a .dark selector with appropriate dark mode values
2. WHILE dark mode is active, THE body background-image SHALL display the dark gradient (linear-gradient from #161616 through #121212 to #0d0d0d)
3. WHILE dark mode is active, THE scrollbar-color SHALL use a subtle light-on-dark color scheme
4. THE dark mode custom variant SHALL be defined as @custom-variant dark (&:is(.dark *)) for Tailwind v4 compatibility
