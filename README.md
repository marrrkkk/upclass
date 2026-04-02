# ![UpClass](./public/logo.svg)

# UpClass

UpClass is a classroom and learning-management web app built for teachers and students. It combines class organization, classwork and quizzes, direct messaging, resource sharing, activity tracking, and collaborative whiteboards in a single Next.js application, with progressive web app and offline support built into the product.

## Highlights

- Role-aware experience for teachers and students
- Class creation and joining with codes, schedules, announcements, and member management
- Draft-aware classwork, submissions, grading history, and quiz workflows
- Class-scoped resource library with private uploads, previews, and a retrieval-based AI assistant
- Direct messaging, class channels, and in-app notifications
- Collaborative whiteboards powered by Excalidraw
- Dashboard and activity views for deadlines, teacher analytics, summaries, and recent activity
- PWA support with service worker caching, install prompts, background sync, and offline-aware flows

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM + PostgreSQL + pgvector
- Better Auth
- Supabase Realtime + Storage
- OpenRouter
- Excalidraw
- Zustand
- Zod
- Vitest + Testing Library

## Project Structure

```text
app/          Next.js routes, layouts, server actions, and API handlers
components/   Feature UI plus shared shadcn-based primitives
db/           Drizzle schema, DB client, and migrations
lib/          Auth, caching, offline sync, PWA helpers, Supabase, utilities
public/       Static assets, manifest, and service worker
whiteboard/   Excalidraw canvas, realtime, persistence, and whiteboard state
tests/        Component, hook, and unit tests
```

## Main App Areas

- `app/(auth)` for sign-in and sign-up
- `app/(main)` for home, activity, classes, messages, notifications, resources, profile, and settings
- `app/actions/*` for server-side mutations
- `app/api/*` for auth, uploads, AI chat, whiteboard APIs, and user lookup

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file with the required values:

```bash
DATABASE_URL=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_PROFILE_MEDIA_BUCKET=
NEXT_PUBLIC_SUPABASE_RESOURCE_FILES_BUCKET=
NEXT_PUBLIC_SUPABASE_MESSAGE_MEDIA_BUCKET=
NEXT_PUBLIC_SUPABASE_SUBMISSION_ATTACHMENTS_BUCKET=
NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET=
OPENROUTER_API_KEY=
OPENROUTER_CHAT_MODEL=openrouter/free
OPENROUTER_EMBED_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=UpClass
RESEND_API_KEY=
EMAIL_FROM="UpClass <notifications@your-domain.com>"
```

> [!IMPORTANT]
> `OPENROUTER_CHAT_MODEL=openrouter/free` uses OpenRouter's free-model router for chat generation.
> `OPENROUTER_EMBED_MODEL` is still required for RAG ingestion because embeddings do not auto-select a model for you.
> The current repo is configured for `nvidia/llama-nemotron-embed-vl-1b-v2:free`, so the pgvector schema now uses `vector(2048)` and the similarity index uses an HNSW `halfvec(2048)` expression to stay within pgvector's index dimension limits.

> [!NOTE]
> `BETTER_AUTH_URL` can be omitted in some hosted environments because the app falls back to `VERCEL_URL`, but setting it explicitly is safer.
> `NEXT_PUBLIC_APP_URL` is also used for SEO metadata, sitemap, robots, and canonical URLs. In production, set it to `https://upclass.xyz`.
> For email delivery, verify your sending domain in Resend and set `EMAIL_FROM` to an address on that domain.

### 3. Bootstrap the database

For a brand-new empty Supabase project, the recommended bootstrap path is:

```bash
npm run db:push
```

That applies the current `db/schema.ts` directly and then configures the Supabase Realtime publication the app depends on.

For an existing database that already follows this repo's migration history, use:

```bash
npm run db:migrate
```

### 4. Configure Supabase storage buckets

```bash
npm run storage:setup
```

This creates or updates the public buckets used for avatars, covers, resources, message media, submission attachments, and whiteboard assets.
The `resource-files` bucket is configured as private because uploaded class resources are now served through authenticated signed-download routes.

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev           # start the local dev server
npm run db:push       # push the current schema to an empty/dev DB and configure Supabase Realtime tables
npm run db:migrate    # apply Drizzle migrations and configure Supabase Realtime tables
npm run realtime:setup # enable required Supabase Realtime publication tables and replica identity settings
npm run storage:setup # create/update Supabase storage buckets
npm run build         # create a production webpack build
npm run build:vercel  # lint, type-check, test, optionally migrate, then webpack build
npm run start         # serve the production build
npm run lint          # run ESLint
npm run type-check    # run TypeScript without emitting files
npm run test          # run Vitest once
npm run test:watch    # run Vitest in watch mode
npm run test:coverage # run Vitest with coverage
```

## Environment & Integrations

### Required services

- PostgreSQL for application data
- pgvector enabled in PostgreSQL for resource embeddings and similarity search
- Better Auth for authentication
- Google OAuth for social sign-in
- Supabase Realtime for live messaging and collaboration updates
- Supabase Storage for media, resources, submissions, and whiteboard assets
- OpenRouter for resource embeddings and grounded chat completions

### Important runtime notes

- Deploy builds on Vercel use `npm run build:vercel`, which gates deploys on `lint`, `type-check`, and `test` before migrations and the production build.
- `build:vercel` only runs `db:migrate` when `DATABASE_URL` is available in the environment; otherwise it skips migrations and continues to the build.
- The target database must already exist and be reachable before deployment builds run.
- Recommended database workflow:
  - Use `npm run db:push` once when bootstrapping a fresh empty Supabase project.
  - Use checked-in migrations plus `npm run db:migrate` for ongoing shared/prod schema changes.
- `npm run db:migrate` now also configures the `supabase_realtime` publication for the tables this app subscribes to: `announcements`, `announcement_reactions`, `classwork`, `submissions`, `notifications`, `messages`, and `channel_messages`.
- `npm run db:push` also configures the same `supabase_realtime` publication and replica identity settings, so a new Supabase project does not need a separate manual Realtime step.
- The migration wrapper also sets `REPLICA IDENTITY FULL` for `announcement_reactions`, `messages`, and `notifications`, because parts of the UI depend on old-row values during update/delete realtime events.
- Upload URL issuance enforces authenticated uploads and validated upload context.
- Resource uploads require a teacher-scoped `classId`, store the original file in a private Supabase bucket, and use authenticated download links for access.
- Resource AI ingestion and retrieval run server-side only; OpenRouter keys are never exposed to the browser.
- Missing Supabase client env vars will degrade realtime behavior.

> [!NOTE]
> If you bypass `npm run db:push` and `npm run db:migrate` and use raw `drizzle-kit push`, direct SQL, or another migration tool instead, run `npm run realtime:setup` yourself on a fresh Supabase project so Realtime subscriptions work.

## Offline, PWA, and Realtime

UpClass treats offline and mobile installation as core product behavior, not an add-on:

- `/sw.js` and `public/manifest.json` provide the PWA runtime
- background cache and sync helpers in `lib/` warm key routes and replay pending actions
- pending offline actions are stored in a dedicated IndexedDB queue so supported mutations can survive reloads and retry safely
- cached data is used for classes, resources, conversations, notifications, and related assets when available
- some flows remain intentionally online-only, including collaborative whiteboards, quiz-taking sync, authenticated uploads, and other live server-dependent operations

> [!IMPORTANT]
> Service worker registration is production-only. In development, the app unregisters service workers and clears `upclass-*` caches to avoid stale local behavior.

## Architecture Notes

- Route pages are mostly server-rendered and fetch initial data with Drizzle and `auth.api.getSession(...)`
- Interactive feature surfaces are split into client components where browser APIs, realtime updates, dialogs, or local state are required
- Shared server input validation lives in `lib/validation/` and uses Zod schemas plus `FormData` parsing helpers for server actions and route handlers
- The main shell sidebar now uses a recent-classes accordion instead of a saved-items/favorites flow
- Messaging includes direct conversations plus a default `general` channel per class, with server-side search and offline queue support for sends
- Assignment submissions track attachments, revisions, and grading history on the current canonical submission row
- Resources are class-scoped records with private storage paths, authenticated file delivery, and AI ingestion state
- The resource assistant uses RAG over extracted PDF, DOCX, and TXT content, with chunk embeddings stored in Postgres pgvector tables and responses grounded to retrieved class materials
- `components/ui/` provides the reusable design-system layer
- `whiteboard/` isolates canvas, persistence, realtime, and state logic for Excalidraw-based collaboration
- Whiteboard saves use optimistic concurrency and return conflict data instead of silently overwriting newer snapshots

## Data Model Overview

The schema in [`db/schema.ts`](./db/schema.ts) covers:

- users, sessions, accounts, and verification records
- classes and class memberships with teacher/student roles
- announcements and reactions
- classwork and submissions
- resources, AI ingestion documents, vector chunks, and resource chat sessions/messages
- messages and notifications
- quizzes, questions, options, attempts, and answers
- whiteboards and persisted whiteboard snapshots

## Testing

The repo includes Vitest coverage for UI, hooks, utilities, and server-side action/API behavior under `tests/`.

Examples:

- class detail tabs
- offline indicator and install prompt behavior
- presence and legacy whiteboard utilities
- background refresh and prefetch hooks
- server actions for classes, resources, and messages
- API routes such as grounded resource AI chat, user lookup, and whiteboard auth checks

## Product Direction

The current product shape is optimized for classroom coordination and low-connectivity environments:

- one shared hub for classes, resources, and communication
- live teaching support through collaborative whiteboards
- structured teacher workflows for grading and review
- mobile-friendly progressive web app behavior for weaker network conditions
