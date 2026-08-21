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