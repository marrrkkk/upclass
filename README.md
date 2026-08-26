# UpClass

UpClass is a multi-tenant classroom workspace for teachers and students. It brings classes, classwork, quizzes, resources, messaging, notifications, study spaces, activity, and collaborative whiteboards into one installable Next.js application. Offline-aware caching and queued mutations support classrooms working on unreliable connections.

## What is included

- Organization onboarding, invitations, role-aware teacher/student/admin views, and Google sign-in
- Classes with schedules, announcements, members, classwork, submissions, grading history, and quizzes
- Resources with uploads, previews, text extraction, chunked retrieval, and grounded AI conversations
- Direct messages and class `general` channels with optimistic updates, realtime reconciliation, and offline text queueing
- Dashboard, calendar, notifications, activity, profiles, settings, and organization administration
- Learn workspace with private study spaces, flashcards, practice quizzes, and spaced review
- Excalidraw whiteboards with persistence, realtime presence, conflict detection, and online-only editing
- Organization-scoped AI assistant with structured read cards, confirmation-gated actions, memory, quotas, and safety filters
- PWA install support, service-worker caching, background refresh, and IndexedDB offline queues

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL, Better Auth, Google OAuth, Supabase Realtime and Storage, Vercel AI SDK, Excalidraw, TanStack Query, Zustand, Zod, Vitest, and Testing Library.

## Repository map

```text
app/          Routes, layouts, server actions, and API handlers
components/   Feature components and shared UI primitives
db/           Drizzle schema and migrations
lib/          Auth, organization access, AI, caching, offline sync, PWA, and utilities
whiteboard/   Excalidraw canvas, persistence, realtime, and state
public/       Manifest, service worker, icons, and static assets
scripts/      Database seed and Supabase Storage setup helpers
tests/        Unit, component, hook, and server tests
docs/         Performance and operational notes
```

Tenant pages live under `app/[orgSlug]/(main)`. The main product routes are `/dashboard`, `/classes`, `/calendar`, `/messages`, `/resources`, `/learn`, `/notifications`, `/settings`, `/admin`, and `/chat`.

## Local setup

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database reachable through `DATABASE_URL`
- A Supabase project for Realtime and Storage
- Google OAuth credentials for sign-in
- At least one configured AI provider for assistant features

### Install and configure

```bash
npm install
Copy-Item env.example .env.local
```

Fill in `.env.local`. The complete variable list is maintained in [`env.example`](env.example). The core values are:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
CEREBRAS_API_KEY=...
```

AI provider keys, Redis cache settings, email delivery, cron protection, whiteboard bucket selection, and the monthly AI credit limit are optional. Never expose service-role, database, OAuth-secret, or cron credentials to the browser.

### Database and Storage

```bash
npm run db:migrate
npm run storage:setup
npm run storage:policies
npm run storage:check
```

Storage setup creates public `avatars` (4 MB), `resources` (16 MB), and `media` (16 MB) buckets. For manual SQL and troubleshooting, see [`SUPABASE_STORAGE_SETUP.md`](SUPABASE_STORAGE_SETUP.md).

### Run the app

```bash
npm run dev
```

Open <http://localhost:3000>. To load the demo dataset, run `npm run db:seed` after migrations. The seed command is intended for development only.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production webpack build |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript without emitting files |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed development data |
| `npm run db:repair-resource-urls` | Audit and repair resource rows whose stored file URL points at an app route |
| `npm run deploy:setup` | Create Storage buckets and attempt RLS setup |
| `npm run storage:setup` | Create missing Storage buckets |
| `npm run storage:policies` | Generate/apply Storage policy SQL |
| `npm run storage:check` | Verify required buckets |
| `npm run build:vercel` | Run lint, type-check, tests, migrations, deploy setup, and build |

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for Vercel setup. `vercel.json` uses `npm run build:vercel` and schedules `/api/cron/token-log-cleanup` daily at 03:00 UTC. That route requires `Authorization: Bearer <CRON_SECRET>`. The message notification worker is available at `/api/cron/message-notifications` for an external scheduler when near-real-time email delivery is needed; Vercel Hobby does not schedule it automatically.

The deploy gate runs migrations and the Storage setup script, so the production database and Supabase project must be provisioned and reachable before the first deployment. Storage setup itself is a no-op when Supabase credentials are absent. Configure Google OAuth with the deployed callback URL `/api/auth/callback/google`.

## Development references

- [`DESIGN.md`](DESIGN.md) and [`components/ui/design-system.md`](components/ui/design-system.md): UI tokens, composition, accessibility, and motion rules
- [`components/ui/QUICK_REFERENCE.md`](components/ui/QUICK_REFERENCE.md): shared component examples
- [`docs/performance-baseline.md`](docs/performance-baseline.md): repeatable performance measurements and acceptance gates
- [`AGENTS.md`](AGENTS.md): repository architecture and contribution guidance for coding agents
- [`CHANGELOG.md`](CHANGELOG.md): release history and unreleased work

## Testing

Run the focused suite while iterating, then the full gates before merging:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Vitest and Testing Library suites live under `tests/`. Route pages stay server-first where possible; browser-only state, realtime subscriptions, and offline behavior belong in client feature components.

## Support

UpClass is currently a private application. Product support is available at [support@upclass.xyz](mailto:support@upclass.xyz).
