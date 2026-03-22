# ![UpClass](./public/logo.svg)

# UpClass

UpClass is a classroom and learning-management web app built for teachers and students. It combines class organization, classwork and quizzes, direct messaging, resource sharing, activity tracking, and collaborative whiteboards in a single Next.js application, with progressive web app and offline support built into the product.

## Highlights

- Role-aware experience for teachers and students
- Class creation and joining with codes, schedules, announcements, and member management
- Classwork, submissions, grading, and quiz workflows
- Resource library with uploads, previews, and a resource-focused AI assistant
- Direct messaging and in-app notifications
- Collaborative whiteboards powered by Excalidraw
- Dashboard and activity views for deadlines, summaries, and recent activity
- PWA support with service worker caching, install prompts, background sync, and offline-aware flows

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM + PostgreSQL
- Better Auth
- Supabase Realtime
- UploadThing
- Excalidraw
- Zustand
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
UPLOADTHING_TOKEN=
GEMINI_API_KEY=
```

> [!NOTE]
> `BETTER_AUTH_URL` can be omitted in some hosted environments because the app falls back to `VERCEL_URL`, but setting it explicitly is safer.
> `NEXT_PUBLIC_APP_URL` is also used for SEO metadata, sitemap, robots, and canonical URLs. In production, set it to `https://upclass.xyz`.

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev           # start the local dev server
npm run db:migrate    # apply Drizzle migrations
npm run build         # create a production build
npm run build:vercel  # run migrations, then build
npm run start         # serve the production build
npm run lint          # run ESLint
npm run test          # run Vitest once
npm run test:watch    # run Vitest in watch mode
npm run test:coverage # run Vitest with coverage
```

> [!TIP]
> There is no dedicated `type-check` script yet. Use `npx tsc --noEmit` when you want an explicit TypeScript pass.

## Environment & Integrations

### Required services

- PostgreSQL for application data
- Better Auth for authentication
- Google OAuth for social sign-in
- Supabase Realtime for live messaging and collaboration updates
- UploadThing for media and resource uploads
- Gemini API for the resource AI assistant

### Important runtime notes

- Deploy builds on Vercel use `npm run build:vercel`, which runs migrations before building.
- The target database must already exist and be reachable before deployment builds run.
- Upload routes enforce authenticated uploads.
- Missing Supabase client env vars will degrade realtime behavior.

## Offline, PWA, and Realtime

UpClass treats offline and mobile installation as core product behavior, not an add-on:

- `/sw.js` and `public/manifest.json` provide the PWA runtime
- background cache and sync helpers in `lib/` warm key routes and replay pending actions
- cached data is used for classes, resources, conversations, notifications, and related assets when available
- some flows remain intentionally online-only, including collaborative whiteboards, quiz-taking sync, authenticated uploads, and other live server-dependent operations

> [!IMPORTANT]
> Service worker registration is production-only. In development, the app unregisters service workers and clears `upclass-*` caches to avoid stale local behavior.

## Architecture Notes

- Route pages are mostly server-rendered and fetch initial data with Drizzle and `auth.api.getSession(...)`
- Interactive feature surfaces are split into client components where browser APIs, realtime updates, dialogs, or local state are required
- `components/ui/` provides the reusable design-system layer
- `whiteboard/` isolates canvas, persistence, realtime, and state logic for Excalidraw-based collaboration

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

The repo already includes Vitest-based coverage for selected hooks, components, and utility modules under `tests/`.

Examples:

- class detail tabs
- offline indicator and install prompt behavior
- presence and legacy whiteboard utilities
- background refresh and prefetch hooks

## Product Direction

The current product shape is optimized for classroom coordination and low-connectivity environments:

- one shared hub for classes, resources, and communication
- live teaching support through collaborative whiteboards
- structured teacher workflows for grading and review
- mobile-friendly progressive web app behavior for weaker network conditions
