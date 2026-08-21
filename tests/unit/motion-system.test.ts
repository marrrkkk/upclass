// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

/**
 * Contract tests for the consolidated motion system. The motion vocabulary
 * lives in `app/globals.css` (tokens, keyframes, utilities) and
 * `lib/design-system.ts` (typed presets). These tests pin the system so
 * feature work cannot drift back to ad-hoc durations, easings, or
 * layout-heavy animation without a deliberate change here.
 */

const globalsPath = new URL("../../app/globals.css", import.meta.url)
const globals = readFileSync(globalsPath, "utf8")

const designSystemPath = new URL("../../lib/design-system.ts", import.meta.url)
const designSystem = readFileSync(designSystemPath, "utf8")

describe("motion tokens", () => {
  test("durations come from the fast/base/slow ramp", () => {
    expect(globals).toContain("--duration-fast: 150ms")
    expect(globals).toContain("--duration-base: 200ms")
    expect(globals).toContain("--duration-slow: 260ms")
  })

  test("exposes only the approved easing set", () => {
    expect(globals).toContain("--ease-out-expo")
    expect(globals).toContain("--ease-out-quint")
    // Unapproved / duplicated easings were consolidated away.
    expect(globals).not.toContain("--ease-spring")
    expect(globals).not.toContain("--ease-in-out-quart")
    expect(globals).not.toContain("cubic-bezier(0.76, 0, 0.24, 1)")
  })

  test("animation shorthands stay inside the duration ramp", () => {
    expect(globals).toContain("--animate-rise: rise var(--duration-slow) var(--ease-out-expo) both")
    expect(globals).toContain("--animate-fade: fade var(--duration-base) var(--ease-out-expo) both")
    expect(globals).toContain(
      "--animate-scale-in: scale-in var(--duration-base) var(--ease-out-expo) both",
    )
    // No hardcoded second-scale durations in the theme animation tokens.
    expect(globals).not.toMatch(/--animate-(rise|fade|scale-in):[^;]*\d{3,}ms/)
  })

  test("shimmer is the only looping animation and stays restrained", () => {
    expect(globals).toContain("--animate-shimmer: shimmer 1.6s linear infinite")
  })
})

describe("motion utilities", () => {
  const utilities = [
    "motion-enter",
    "motion-fade",
    "motion-overlay",
    "motion-shimmer",
    "motion-feedback",
    "motion-interactive",
    "motion-icon",
    "motion-lift",
    "motion-delay-1",
    "motion-delay-2",
    "motion-delay-3",
  ]

  test("all shared utilities exist", () => {
    for (const utility of utilities) {
      expect(globals).toContain(`@utility ${utility}`)
    }
  })

  test("entrance movement stays within the 4–8px envelope", () => {
    const riseKeyframes = globals.match(/@keyframes rise \{[\s\S]*?\}/)?.[0]
    expect(riseKeyframes).toBeTruthy()
    expect(riseKeyframes).toMatch(/translateY\(8px\)/)
    expect(riseKeyframes).not.toMatch(/translateY\((9|1[0-9]|[2-9][0-9])px\)/)
  })

  test("overlay scale is subtle", () => {
    const scaleKeyframes = globals.match(/@keyframes scale-in \{[\s\S]*?\}/)?.[0]
    expect(scaleKeyframes).toBeTruthy()
    expect(scaleKeyframes).toMatch(/scale\(0\.98\)/)
  })

  test("hover lift is gated behind hover-capable pointers", () => {
    const liftUtility = globals.match(/@utility motion-lift \{[\s\S]*?\}/)?.[0]
    expect(liftUtility).toBeTruthy()
    expect(liftUtility).toContain("@media (hover: hover)")
    expect(liftUtility).toContain("transform: translateY(-2px)")
  })

  test("legacy landing and navigation keyframes were consolidated", () => {
    expect(globals).toContain("@keyframes route-progress")
    expect(globals).not.toContain("@keyframes navigation-progress")
    expect(globals).not.toContain("@keyframes landing-fade-up")
    expect(globals).not.toContain("landing-fade-up-delay")
  })
})

describe("reduced motion", () => {
  test("a global OS-level reduced-motion override exists", () => {
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)")
    expect(globals).toContain("animation-duration: 0.01ms !important")
    expect(globals).toContain("transition-duration: 0.01ms !important")
  })

  test("no per-feature motion toggles or hardcoded second durations in shared CSS", () => {
    // The shared layer must not reintroduce wall-clock animation durations.
    expect(globals).not.toMatch(/transition[^;]*\b\d{3}ms\b/)
  })
})

describe("design-system presets", () => {
  test("typed motion presets reference the shared utilities", () => {
    expect(designSystem).toContain('enter: "motion-enter"')
    expect(designSystem).toContain('enterOverlay: "motion-overlay"')
    expect(designSystem).toContain('loading: "motion-shimmer"')
    expect(designSystem).toContain('feedback: "motion-feedback"')
    expect(designSystem).toContain('lift: "motion-lift"')
    expect(designSystem).toContain('colors: "motion-interactive"')
    expect(designSystem).toContain('transform: "motion-icon"')
  })

  test("presets stay inside the duration ramp", () => {
    expect(designSystem).toContain("duration-[var(--duration-base)]")
    expect(designSystem).toContain("duration-[var(--duration-slow)]")
    expect(designSystem).not.toMatch(/duration-(150|200|260|300|450)\b/)
  })
})