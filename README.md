# ![UpClass](./public/logo.svg)

# UpClass

UpClass is a classroom and learning-management web app built for teachers and students. It combines class organization, classwork and quizzes, direct messaging, resource sharing, activity tracking, and collaborative whiteboards in a single Next.js application, with progressive web app and offline support built into the product.

## Highlights

- Role-aware experience for teachers and students
- Class creation and joining with codes, schedules, announcements, and member management
- Draft-aware classwork, submissions, grading history, and quiz workflows
- Resource library with uploads, previews, and a resource-focused AI assistant
- Direct messaging, class channels, and in-app notifications
- Collaborative whiteboards powered by Excalidraw
- Dashboard and activity views for deadlines, teacher analytics, summaries, and recent activity
- PWA support with service worker caching, install prompts, background sync, and offline-aware flows

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM + PostgreSQL
- Better Auth
- Supabase Realtime
- Supabase Storage
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
- `app/org` for organization selection, creation, and invitation joins
- `app/[orgSlug]/(main)` for tenant-scoped dashboard, calendar, classes, messages, notifications, resources, profiles, settings, administration, and the org-scoped AI assistant chat
- `app/actions/*` for server-side mutations
- `app/api/*` for auth, uploads, AI chat, AI assistant (conversations, actions), token-log cron, whiteboard APIs, and user lookup

## Design System

UI styling is centralised in three learning-studio layers. Feature code composes shared primitives
and typed variants, while tokens are consumed through semantic Tailwind classes. The authenticated
application uses a **Gray Canvas** language: a fullscreen `#EBEBEB` workspace,
one white organization sidebar containing only real UpClass routes and recent
class records, an azure action and selection hierarchy (`#0B99FF`), Inter type in
near-black ink, borderless white cards resting on the soft `shadow-e1` elevation,
and selective structural hairlines. The compact top bar exposes only page-owned
actions and account controls, keeping classes, resources, communication, and
classroom work easy to scan without changing tenant-aware behavior:

- `app/globals.css` — design tokens. Tailwind v4 is CSS-first here, so there is no
  `tailwind.config.*`; colours, semantic status tones, layered surfaces, the
  `shadow-e1`…`shadow-e4` elevation ramp, easing curves, the typography scale and
  the interaction/texture utilities all live in `@theme inline` blocks.
- `lib/design-system.ts` — typed variants, layout widths, spacing rhythm and
  motion presets.
- `components/ui/*` — shared primitives built on both (`Panel`, `Text`,
  `DataTable`, `Field`, `IconBadge`, `StatusBadge`, `EmptyState`, and friends).

Reference docs: [`components/ui/design-system.md`](components/ui/design-system.md)
for the rationale and [`components/ui/QUICK_REFERENCE.md`](components/ui/QUICK_REFERENCE.md)
for copy-paste snippets. New UI should use semantic tones (`primary`, `success`,
`warning`, `info`, `danger`, `neutral`) rather than raw palette values, and the
elevation ramp rather than ad-hoc shadows.

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
# AI - Uses Vercel AI SDK with Cerebras via OpenAI-compatible provider
CEREBRAS_API_KEY=
# Optional: defaults to gpt-oss-120b
CEREBRAS_MODEL=
# Org-scoped AI assistant: embedding models for knowledge-base retrieval and
# the canary token used to detect system-prompt leakage (random per deployment)
GOOGLE_GENERATIVE_AI_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
AI_CANARY_SECRET=
# Cron route protection for scheduled maintenance and notification delivery
CRON_SECRET=
RESEND_API_KEY=
EMAIL_FROM="UpClass <notifications@your-domain.com>"
```

> [!NOTE]
> `BETTER_AUTH_URL` can be omitted in some hosted environments because the app falls back to `VERCEL_URL`, but setting it explicitly is safer.
> `NEXT_PUBLIC_APP_URL` is also used for SEO metadata, sitemap, robots, and canonical URLs. In production, set it to `https://upclass.xyz`.
> For email delivery, verify your sending domain in Resend and set `EMAIL_FROM` to an address on that domain.

### Scheduled jobs on Vercel Hobby

Vercel Hobby supports the daily token-log cleanup schedule used by this project, but it does not support the every-minute schedule required for prompt message email notifications. The notification worker remains available at:

```text
GET https://upclass.xyz/api/cron/message-notifications
Authorization: Bearer <CRON_SECRET>
```

Configure an external scheduler such as cron-job.org, EasyCron, GitHub Actions, or Supabase `pg_cron` to call that URL every 1–5 minutes. Keep `CRON_SECRET` set in Vercel and send it as a secret; do not put the token in the URL. If near-real-time email is not required, a once-daily scheduler is also valid and requires no paid Vercel plan.

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Set up Supabase Storage

UpClass uses Supabase Storage for file uploads (avatars, resources, media).

**Automatic setup (recommended):**

```bash
# Create the storage buckets
npm run storage:setup

# Set up Row Level Security policies
npm run storage:policies

# Verify everything is configured
npm run storage:check
```

**Manual setup:**

If the automatic setup doesn't work, follow the detailed guide in [`SUPABASE_STORAGE_SETUP.md`](./SUPABASE_STORAGE_SETUP.md).

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev            # start the local dev server
npm run db:migrate     # apply Drizzle migrations
npm run db:seed        # seed demo classes and students for definitelynotmark13@gmail.com
npm run build          # create a production webpack build
npm run build:vercel   # lint, type-check, test, migrate, setup storage, then build (used by Vercel)
npm run deploy:setup   # set up storage buckets and RLS policies (used during deployment)
npm run start          # serve the production build
npm run lint           # run ESLint
npm run type-check     # run TypeScript without emitting files
npm run test           # run Vitest once
npm run test:watch     # run Vitest in watch mode
npm run test:coverage  # run Vitest with coverage
npm run storage:setup  # create Supabase storage buckets
npm run storage:policies # get SQL for RLS policies
npm run storage:check  # verify storage bucket configuration
```

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for complete deployment instructions for Vercel.

**Quick deploy:**

1. Push to GitHub/GitLab
2. Connect to Vercel
3. Add environment variables
4. Deploy! (migrations and storage setup run automatically)

The `build:vercel` script automatically:
- ✅ Runs linting and type checks
- ✅ Runs tests
- ✅ Applies database migrations
- ✅ Creates storage buckets
- ✅ Builds the application

## Environment & Integrations

### Required services

- PostgreSQL for application data
- Better Auth for authentication
- Google OAuth for social sign-in
- Supabase Realtime for live messaging and collaboration updates
- Supabase Storage for media and resource uploads
- Vercel AI SDK with Cerebras provider for the resource AI assistant, grounded in supported uploaded resource file text (PDF, DOCX, XLSX, CSV, and plain text)
- Vercel AI SDK for the org-scoped AI assistant, backed by a provider registry (`lib/ai-providers.ts`, `registry.ts`) with Cerebras as the default and Google/Mistral/OpenRouter/Groq as fallbacks; embeddings for the org knowledge base come from Google or Mistral

### AI assistant (org scope)

The assistant lives at `app/[orgSlug]/(main)/chat`, in the dashboard and class surfaces (`Ctrl+J` opens the slide-in panel from anywhere). It combines:

- **Orchestration** (`lib/ai/orchestrator/`): intent classification (cached), org memory retrieval (embedding search over admin-curated entries), conversation compression with summaries, per-intent output-token budgets, prompt budgeting over a 9-module system prompt, and a tool selector that caps read tools per turn and gates draft actions to teachers/owners.
- **25 read tools + 4 draft action tools** (`lib/ai/tools/`): seven read tools return structured cards rendered as data cards; the four action tools produce interactive confirmation cards that run the mutation only on confirm.
- **Safety**: input sanitization (blocklists, locked-detection), output filtering with an HMAC canary token that redacts system-prompt leakage, per-user rate limiting (20 req/min, persisted failed turns), monthly budget caps per org via `lib/ai/usage-limiter.ts`, and per-turn step/tool budgets.
- **Persistence**: conversations, messages (with structured-output/action metadata), and an org knowledge base (`ai_*` tables, migration `0010_fixed_famine.sql`); a daily cron (`/api/cron/token-log-cleanup`, `CRON_SECRET` bearer) prunes token logs older than 90 days.

### Important runtime notes

- Deploy builds on Vercel use `npm run build:vercel`, which gates deploys on `lint`, `type-check`, and `test` before migrations and the production build.
- `build:vercel` only runs `db:migrate` when `DATABASE_URL` is available in the environment; otherwise it skips migrations and continues to the build.
- The target database must already exist and be reachable before deployment builds run.
- Upload routes enforce authenticated uploads.
- Missing Supabase client env vars will degrade realtime behavior.

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
- The main shell sidebar uses an LMS-oriented hierarchy with a compact recent-course shelf instead of a saved-items/favorites flow
- Messaging includes organization-scoped direct conversations plus a default `general` channel per class. Messages use cursor pagination, idempotent client IDs, optimistic/realtime reconciliation, IndexedDB offline text queueing, and a protected notification outbox cron. `SUPABASE_JWT_SECRET` bridges Better Auth sessions to Supabase RLS; attachments remain online-only.
- Assignment submissions track attachments, revisions, and grading history on the current canonical submission row
- `components/ui/` provides the reusable design-system layer
- `whiteboard/` isolates canvas, persistence, realtime, and state logic for Excalidraw-based collaboration
- Whiteboard saves use optimistic concurrency and return conflict data instead of silently overwriting newer snapshots

## Data Model Overview

The schema in [`db/schema.ts`](./db/schema.ts) covers:

- users, sessions, accounts, and verification records
- classes and class memberships with teacher/student roles
- announcements and reactions
- classwork and submissions
- resources and file metadata
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
- API routes such as AI chat, user lookup, and whiteboard auth checks

## Product Direction

The current product shape is optimized for classroom coordination and low-connectivity environments:

- one shared hub for classes, resources, and communication
- live teaching support through collaborative whiteboards
- structured teacher workflows for grading and review
- mobile-friendly progressive web app behavior for weaker network conditions
