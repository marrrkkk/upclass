# Performance Baseline

Methodology for measuring and comparing load performance of the UpClass app.
This document defines what is measured, how, and the current known state so
future performance work has a repeatable reference point.

## Measurement Method

- Profile in a Chromium browser with a clean profile (no extensions), DevTools
  Performance panel, and throttle set to "Fast 4G" + 4x CPU slowdown for the
  mobile pass; no throttling for the desktop pass.
- Capture per route: Time to First Byte (TTFB), Largest Contentful Paint
  (LCP), Cumulative Layout Shift (CLS), and client module count on the main
  document request.
- Run each measurement at least 3 times, cold cache, and record the median.
- Routes to cover: unauthenticated landing, sign-in, sign-up, org entry
  (invite/join), authenticated shell, dashboard, classes list, class detail,
  resources, messages, activity, profile, settings, chat, AI assistant panel,
  and whiteboard.
- Record from `npm run build` output: first-load JS per route, total modules
  per route, and the largest chunks.

## Current State (baseline, Aug 2026)

Findings from the initial audit:

- 3 raw `<img>` usages (resource cards, image viewer dialog, chat image
  attachments) all render inside fixed-size containers, so they cause no CLS;
  they predate `next/image` adoption. `next/image` is used for profile covers.
- `next.config.ts` has no `images.remotePatterns` configured, so user-uploaded
  images must stay on raw `<img>` or remote patterns must be added.
- Excalidraw whiteboard and the image cropper are already `next/dynamic`,
  keeping the heavy editor bundles out of the main document.
- `optimizePackageImports` covers `lucide-react` and two Radix packages.
- 140 files carry a `"use client"` directive. Before splitting or converting
  any of them, record the per-route module delta in this document.
- No bundle analyzer is wired up; add one (`@next/bundle-analyzer`) only if a
  baseline run shows a bottleneck worth visualizing.

### Shell / server-data pass (Aug 2026)

Changes made after the initial audit, all verified by `npm run lint`,
`npm run type-check`, `npm run test` (105 suites / 530 tests), and
`npm run build`:

- The tenant layout (`app/[orgSlug]/(main)/layout.tsx`) awaited params, the
  session, membership, and recent classes strictly sequentially. It now
  resolves params + session together and runs membership and recent classes in
  parallel; recent classes join on the org slug so they no longer wait on the
  membership's org id. One serial roundtrip removed from every tenant page.
- `validateOrgAccess` (runs in the proxy on every request) issued two
  sequential queries (org exists, then membership). It is now a single joined
  query preserving both `org_not_found` and `not_a_member` reasons.
- `getOrganizationMembership` is React-request-cached so layout and page-level
  callers dedupe within a request.
- The resources creation dialog loaded every class in the org without a cap;
  it now caps at 100 rows.
- Authenticated org reloads previously streamed a fallback that rendered the
  signed-out header ("Welcome to UpClass" + Sign in / Get started). The
  `HomeShell` fallback now renders the real sidebar structure plus a header
  skeleton with no auth CTAs; those CTAs appear only in the confirmed
  unauthenticated shell.

### Resource preview fix (Aug 2026)

- Resource detail iframes embedded raw stored `fileUrl` values; legacy rows
  whose URL pointed at an app route rendered an UpClass page inside the frame.
  A canonical helper (`lib/resource-file.ts`) now classifies stored URLs
  (seeded `/seeded-resources/*`, external storage URLs, legacy app routes) and
  only validated direct sources are embedded in the detail iframe, list-card
  thumbnails, and download links.
- New access-checked endpoint `GET /api/resources/[id]/file` serves anything
  not safely servable directly: it streams seeded files inline with correct
  content type/disposition and redirects to storage URLs, repairing from
  `storagePath`/`fileName` where possible. `npm run db:repair-resource-urls`
  audits and backfills legacy rows.
- Seeded resources remain served from `public/seeded-resources` and uploaded
  resources remain served from the storage bucket; the proxy only handles rows
  whose stored URL cannot be trusted.

### Build output caveat

Next.js 16 with `cacheComponents` (PPR) no longer prints per-route First Load
JS in `next build` output. Record route-level JavaScript from the generated
chunks instead. Largest production chunks at this baseline (`.next/static/chunks`,
gzip-agnostic on-disk sizes): ~1.77 MB shared framework/vendor chunk, then
~634 KB, ~485 KB, ~429 KB, ~420 KB, ~396 KB, ~258 KB, and ~219 KB chunks,
~10.3 MB total across all chunks. Web Vitals numbers still require the manual
browser method described above.

### E2E coverage note

The repository has no dedicated e2e harness yet. The
reload-skeleton and seeded-PDF-preview flows from the plan are covered at the
component and route-handler level instead: `tests/components/layouts/
home-shell.test.tsx` asserts the pending shell keeps the sidebar visible with
no auth CTAs, and `tests/server/resource-file-route.test.ts` asserts the file
endpoint streams PDF bytes/content-type inline rather than an HTML page. Wire
these into Playwright when an e2e harness lands.

## Perf Contract

- Motion durations stay within the `--duration-fast|base|slow` ramp
  (150/200/260ms); transform/opacity only, never layout properties.
- No route-wide blocking loaders; localized Suspense boundaries with
  skeletons from `components/skeletons.tsx`.
- Keep `cacheComponents`, `cachedNavigations`, and `staleTimes` behavior in
  `next.config.ts` intact when changing route loading.

## Gates

Performance work is gated by the same acceptance checks as everything else:

1. `npm run lint` — no errors.
2. `npm run type-check` — no errors.
3. `npm run test` — full suite green.
4. `npm run build` — succeeds; record any first-load JS changes.
5. Web Vitals (LCP, CLS, INP) on the routes above should not regress; if a
   change is load-heavy on purpose, record the numbers before/after here.