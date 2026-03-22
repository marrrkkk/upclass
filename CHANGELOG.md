# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Minimal public `/terms`, `/privacy`, and `/contact` pages so auth and support links resolve to live routes.
- Draft/resubmission assignment workflow support with multiple submission attachments, revision history, grading history, and richer classwork review dialogs.
- Teacher analytics on Home covering overdue work, a global review queue, unread student questions, low-participation alerts, and weekly summary cards.
- Class `general` channels, unified messaging search, and offline queue support for direct and channel message sends.

### Changed
- Changelog entries will be tracked here before the next tagged release.
- Rebuilt the app SEO configuration around the production domain `https://upclass.xyz` with richer metadata, structured data, sitemap and robots support, social preview images, and `noindex` protection for authenticated app routes.
- Deploy builds now gate on lint, type-check, and test before migrations and the production build.
- Deploy builds now skip `db:migrate` when `DATABASE_URL` is missing instead of failing before the application build starts.
- Production builds now use webpack instead of Turbopack to avoid Excalidraw CSS build crashes in restricted deploy environments.
- Whiteboard snapshot persistence now uses optimistic concurrency with reload-on-conflict handling instead of last-write-wins version bumps.
- Cache cleanup removed the old page HTML cache layer in favor of the typed IndexedDB data caches already used by offline flows.
- Notification delivery now runs through a shared provider abstraction instead of leaving email and push TODOs in server actions.
- Transactional email delivery now runs through Resend using React Email templates and a dedicated authenticated test endpoint.

### Removed
- The favorites feature, `/favorites` route, favorite toggles, and supporting saved-item schema/helpers were removed in favor of a simpler recent-classes sidebar flow.

## [0.1.0] - 2026-03-21

### Added
- Initial Next.js 16 application setup with Drizzle ORM, Better Auth, Google OAuth, Tailwind CSS, and UploadThing integration.
- Role-aware onboarding, profile editing, avatar cropping, settings management, and authenticated landing-page routing.
- Core classroom workflows for classes, schedules, announcements, people management, resources, classwork, quizzes, submissions, grading, and reactions.
- Public access paths for class details and resources while preserving authenticated role checks for member actions.
- Home dashboard, activity timeline, messaging, notifications, and responsive navigation for desktop and mobile layouts.
- Whiteboard collaboration support, later rebuilt around Excalidraw with in-app syncing and persisted board documents.
- Progressive Web App support including a service worker, offline indicators, queued offline actions, background caching, and app install controls.
- Shared Zustand stores for user, class, message, notification, and resource state.
- Vitest and React Testing Library setup with initial frontend unit and component coverage.
- Repository guidance and project skill metadata for local coding-agent workflows.

### Changed
- Reworked the marketing landing page, authenticated shell, sidebar, headers, dialogs, and button primitives for a more polished responsive UI.
- Split class UI flows, quiz-taking paths, and shared hooks/types into clearer top-level modules to simplify maintenance.
- Refined loading states across class tabs, home, messages, notifications, and settings with more accurate skeleton UIs.
- Improved class tab transitions with optimistic tab switching, tab-scoped loading, and warm in-session revisits.
- Streamed main authenticated routes through localized Suspense boundaries and consolidated shared server-side loaders.
- Reduced client-side hydration and app chrome across the shell, classes, and messaging surfaces to improve perceived performance.
- Expanded offline and PWA behavior with stronger cache handling, server-status feedback, and app controls.

### Fixed
- Corrected multiple hydration mismatches affecting the home greeting, activity heatmap, and offline-aware home flows.
- Hardened whiteboard session handling and removed legacy whiteboard modules during the Excalidraw migration.
- Restored dynamic browser titles and fixed build blockers related to prerendered routes and remote font loading.
- Stabilized deploy-time database migrations for Vercel builds by updating the migration command and Drizzle tooling.
- Fixed cache-writing behavior in the service worker and disabled zero-interval background refresh polling.
- Resolved dependency alignment issues around React and whiteboard peer requirements.
