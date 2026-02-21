# AGENTS.md – UpClass

Guidance for AI agents working in this codebase.

## Project overview

**UpClass** is a Learning Management System (LMS): classes, resources, messaging, real-time whiteboard, quizzes, classwork, notifications, and user profiles (teacher/student). It is a **Next.js 16** app with **PWA/offline support**, **Supabase Realtime**, and a **PostgreSQL** backend.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix), `class-variance-authority`, `clsx` + `tailwind-merge` |
| State | Zustand (client); server state via Server Actions + cache |
| Auth | better-auth (Drizzle adapter, optional Google OAuth) |
| Database | PostgreSQL via `postgres` (postgres-js), Drizzle ORM |
| Realtime | Supabase Realtime (optional; `lib/supabase-client.ts`) |
| File upload | UploadThing |
| PWA / offline | Service worker, IndexedDB, background sync, offline action queue |

## Paths and structure

- **Path alias**: `@/*` → project root (e.g. `@/lib/utils`, `@/db/schema`, `@/components/ui/button`).
- **App Router**: `app/` – routes under `(auth)/`, `(main)/`, plus `app/actions/`, `app/api/`.
- **Server Actions**: All in `app/actions/*.ts`; each file starts with `"use server"`.
- **API routes**: `app/api/` (e.g. `uploadthing`, `ai/chat`, `users/by-email`). Catch-all for better-auth: `app/api/[...all]/route.ts`.
- **Components**: `components/` – feature folders (`classes/`, `messages/`, `resources/`, `whiteboard/`, etc.) and `components/ui/` for shadcn primitives.
- **Shared logic**: `lib/` – auth, Supabase client, stores, hooks, offline/sync, cache, `utils.ts` (e.g. `cn()`).
- **Database**: `db/schema.ts` (Drizzle schema + relations), `db/index.ts` (Drizzle client using `DATABASE_URL`).

## Conventions

### Server Actions

- Use `"use server"` at the top of files in `app/actions/`.
- Get session with `auth.api.getSession({ headers: await headers() })` from `@/lib/auth`; return structured errors (e.g. `{ success: false, error: string }`) for client handling.
- Validate inputs (e.g. required fields, role checks); use `revalidatePath` / `revalidateTag` when mutating data that affects the UI.
- Prefer Drizzle for all DB access (no raw Supabase DB client for app data).

### Database (Drizzle)

- Schema and relations live in `db/schema.ts`; use `db` from `@/db` (postgres-js).
- Use `eq`, `and`, `desc`, etc. from `drizzle-orm`; use transactions for multi-step writes.
- IDs are typically `text` (e.g. `crypto.randomUUID()`); enums and indexes are defined in the schema.

### Auth

- better-auth is configured in `lib/auth.ts` (Drizzle adapter, optional Google). Client helpers in `lib/auth-client.ts`.
- Protect actions and API routes by checking `session?.user?.id` (and optionally `user.role` from `user` table).

### UI and styling

- Use `cn(...)` from `@/lib/utils` for conditional Tailwind classes.
- Prefer existing `components/ui/*` (Button, Card, Dialog, Input, etc.); extend with `cva` and Radix where needed.
- Theme: CSS variables in `app/globals.css`; dark mode via `next-themes` (e.g. `ThemeProvider`).
- Tailwind 4 with `@theme inline` and `@custom-variant`; avoid ad-hoc arbitrary values when a theme token exists.

### Client state and data

- Global client state: Zustand stores in `lib/stores/` (e.g. `user-store`, `classes-store`, `messages-store`).
- Server data: fetch in Server Components or call Server Actions from Client Components; use loading.tsx and skeletons where appropriate.
- Offline: respect `lib/offline-action-handler.ts`, `lib/sync-manager.ts`, and `lib/background-cache.ts`; avoid bypassing the offline queue for mutating actions.

### File uploads

- UploadThing: config in `app/api/uploadthing/core.ts` (middleware uses auth session); use `@uploadthing/react` and `lib/uploadthing.ts` on the client. Upload styles are imported in `app/globals.css`.

### Realtime

- Supabase is used for realtime only (e.g. presence, channels). Create client from `lib/supabase-client.ts`; handle missing env (realtime disabled) without throwing.

## Environment

- **Database**: `DATABASE_URL` (Postgres connection string).
- **Auth**: `AUTH_SECRET`, `AUTH_URL` / `BETTER_AUTH_URL`; optional `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **Supabase** (realtime): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **UploadThing**: `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`.

See README for a full list and setup steps.

## Commands

- `npm run dev` – development server
- `npm run build` – production build
- `npm run lint` – ESLint (Next.js config)
- No `npm run test` script in package.json; add tests under a `tests/` or `__tests__/` convention if introducing them.

## What to avoid

- Don’t use Supabase for primary app data or migrations; use Drizzle and `db/` only.
- Don’t add new global state without considering existing Zustand stores and offline/sync behavior.
- Don’t skip session/role checks in Server Actions or upload middleware.
- Don’t break PWA/offline flows: keep action queue and cache layers in mind when changing mutations or navigation.

## Quick reference

- **New server action**: Add to appropriate file in `app/actions/`, `"use server"`, get session, validate, use `db` + Drizzle, return `{ success, error? }` or data.
- **New API route**: Add under `app/api/<name>/route.ts`; protect with `auth.api.getSession` if needed.
- **New UI component**: Prefer `components/ui/` for primitives (use `cn()` and existing variants); feature-specific components in the right feature folder under `components/`.
- **New DB table/column**: Edit `db/schema.ts`, then run Drizzle migrations (e.g. `drizzle-kit generate` / `drizzle-kit migrate` as per project setup).
