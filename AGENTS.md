# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js 16 App Router, including route groups, `app/actions/*.ts` server actions, and `app/api/*` handlers. `components/` is split by feature (`classes/`, `messages/`, `resources/`, `whiteboard/`) with shared shadcn primitives in `components/ui/`. `lib/` holds shared client/server utilities such as auth, caching, offline sync, Zustand stores, and Supabase realtime helpers. Database schema and migrations live in `db/`. Static assets, the service worker, and the PWA manifest are in `public/`.

## Build, Test, and Development Commands
- `npm install`: install project dependencies.
- `npm run dev`: start the local development server on `http://localhost:3000`.
- `npm run build`: create a production build.
- `npm run start`: serve the production build locally.
- `npm run lint`: run ESLint for the repo.

There is currently no dedicated `test` or `type-check` script in `package.json`; add one if you introduce automated tests or a separate typecheck step.

## Coding Style & Naming Conventions
Use TypeScript with strict typing and existing path aliases such as `@/lib/utils`. Follow the current style: React components in PascalCase, hooks/utilities in camelCase, and route or feature folders in kebab-case where applicable. Prefer existing UI primitives from `components/ui/` and compose classes with `cn(...)` from `lib/utils.ts`. Keep server actions in `app/actions/` with `"use server"` at the top, and use Drizzle via `db/index.ts` for app data access.

## Testing Guidelines
No test framework is wired up yet, and no `tests/` or `__tests__/` directory exists today. For changes with meaningful business logic, add focused tests alongside the feature or under a top-level `tests/` directory, and document the command needed to run them in your PR. At minimum, run `npm run lint` and exercise affected flows locally before submitting.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit style, for example `feat(whiteboard,realtime): rebuild board sync and in-app flow` and `refactor(hooks,stores): move shared modules to root`. Keep commits scoped and descriptive. PRs should explain user-visible changes, note schema or env updates, link related issues, and include screenshots or short recordings for UI changes.

## Security & Configuration Tips
Required secrets include `DATABASE_URL`, auth settings, Supabase realtime keys, and UploadThing credentials. Never hardcode secrets or bypass session and role checks in server actions or API routes. When changing offline or realtime flows, preserve the queueing and sync behavior in `lib/offline-action-handler.ts` and `lib/sync-manager.ts`.
