# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js 16 App Router. Route groups are split into `app/(auth)` for sign-in and sign-up, `app/(main)` for the authenticated shell and primary product surfaces, `app/actions/*.ts` for server actions, and `app/api/*` for auth passthrough, uploads, AI chat, whiteboard persistence, and user lookup. Shared layouts are rooted in `app/layout.tsx` and `app/(main)/layout.tsx`.

`components/` is organized by feature area: `classes/`, `messages/`, `resources/`, `home/`, `activity/`, `notifications/`, `profile/`, `settings/`, `onboard/`, and shell/navigation pieces under `layouts/` and `sidebar/`. Shared shadcn primitives stay in `components/ui/`, and shared loading states live in `components/skeletons.tsx`.

`lib/` holds shared auth, server helpers, caching, background refresh, offline sync, PWA helpers, Supabase realtime, and feature utilities. Active shared support code also exists outside `lib/`: `hooks/` contains route prefetch and class/realtime hooks, `stores/` contains Zustand stores, `types/` contains shared domain types, and `whiteboard/` isolates Excalidraw canvas, realtime, persistence, and whiteboard state logic. Database schema and migrations live in `db/`. Static assets, the service worker, and the manifest live in `public/`. Automated tests live in `tests/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local development server on `http://localhost:3000`.
- `npm run db:migrate`: apply Drizzle migrations using `drizzle.config.ts`.
- `npm run build`: create a production build.
- `npm run build:vercel`: run migrations, then build; this is the deploy build used by `vercel.json`.
- `npm run start`: serve the production build locally.
- `npm run lint`: run ESLint via the flat config in `eslint.config.mjs`.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run test:coverage`: run Vitest with coverage.

There is still no dedicated `type-check` script in `package.json`; use `npx tsc --noEmit` when an explicit TypeScript pass is needed.

## Coding Style & Naming Conventions
Use TypeScript with strict typing and existing path aliases such as `@/lib/utils`. Follow the current style: React components in PascalCase, hooks/utilities in camelCase, and route or feature folders in kebab-case where applicable. Prefer existing UI primitives from `components/ui/` and compose classes with `cn(...)` from `lib/utils.ts`.

Keep route pages and layouts server-first when possible, and push browser-only state or realtime interactivity into leaf client components. Keep server actions in `app/actions/` with `"use server"` at the top, and use Drizzle via `db/index.ts` for app data access. For navigation/loading work, prefer localized Suspense boundaries and existing skeleton components over route-wide blocking loaders.

## Architecture Notes
Most route pages are server components that fetch initial data with Drizzle and auth helpers, then hand off to client feature components for interactivity. The authenticated shell is centralized in `components/layouts/home-shell.tsx`, and route-content transitions are handled through `components/layouts/route-content-transition.tsx` with route-specific skeletons.

Offline, PWA, caching, and realtime behavior are core product concerns, not add-ons. Before changing data loading or mutation flows, inspect related modules such as `lib/background-cache.ts`, `lib/background-sync.ts`, `lib/cache-hooks.ts`, `lib/cache/page-cache.ts`, `lib/offline-action-handler.ts`, `lib/pwa-register.ts`, `lib/pwa-state.ts`, `lib/sync-manager.ts`, and `lib/supabase-client.ts`. Preserve queueing, replay, cache warming, and sync behavior unless the task explicitly changes them.

`next.config.ts` enables `cacheComponents`, `experimental.cachedNavigations`, `experimental.staleTimes`, optimized package imports, and service-worker/manifest headers. Keep those performance assumptions in mind when adjusting route-loading or caching behavior.

## Testing Guidelines
Vitest is already wired up with config in `vitest.config.ts` and shared setup in `tests/setup.ts`. Existing coverage lives under `tests/components/`, `tests/hooks/`, and `tests/unit/`.

For changes with meaningful business logic, shared utilities, state management, or user-critical UI behavior, add focused tests alongside the existing suites. At minimum, run `npm run lint` and the relevant Vitest command for the affected area before submitting. If you add or change a developer workflow, update the documented command in `README.md` and related docs.

## Documentation & Release Maintenance
`README.md` is the high-level source of truth for setup, environment variables, scripts, architecture, and deployment workflow. Check it before changing setup docs, commands, or runtime expectations, and keep it aligned when those change.

`CHANGELOG.md` is a maintained Keep a Changelog document. Add or update `Unreleased` entries for notable user-visible features, fixes, performance work, behavior changes, testing milestones, or release prep when your change materially affects the product. When cutting a release, move relevant `Unreleased` entries into a dated versioned section.

The package version in `package.json` is currently `0.1.0` and should stay aligned with the latest released section in `CHANGELOG.md`. Do not bump the version for every code change. Update the version only when preparing a release or when the user explicitly asks for release/version work, and sync that bump with the released changelog entry.

When changing scripts, environment requirements, release flow, or testing expectations, review whether `README.md`, `CHANGELOG.md`, and `AGENTS.md` all need coordinated updates.

## Commit & Pull Request Guidelines
Recent history uses scoped Conventional Commits such as `feat(classes,tabs): optimize class tab transitions`, `perf(navigation,cache): keep visited routes warm longer`, and `fix(navigation,messages): stream page skeletons on route change`. Keep commits scoped, descriptive, and logically grouped.

PRs should explain user-visible changes, note schema or env updates, mention testing performed, and include screenshots or recordings for UI changes. When practical, keep documentation-only release bookkeeping separate from product code changes.

## Security & Configuration Tips
Required secrets include `DATABASE_URL`, Better Auth settings, Google OAuth credentials, Supabase realtime keys, UploadThing credentials, and the Gemini API key. Never hardcode secrets or bypass session and role checks in server actions or API routes.

Deploy builds on Vercel use `npm run build:vercel`, which runs migrations before building. Ensure database changes, migration files in `db/migrations/`, and environment requirements stay consistent. When changing uploads, realtime, offline, or whiteboard flows, verify that auth checks and server-dependent constraints still hold.
