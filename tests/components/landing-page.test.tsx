// @vitest-environment node


import { renderToStaticMarkup } from "react-dom/server"

import LandingPage from "@/app/page"

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}))

describe("LandingPage", () => {
  it("renders the editorial hero, public CTA, and workspace preview", async () => {
    const markup = renderToStaticMarkup(await LandingPage())

    expect(markup).toContain("Teaching made")
    expect(markup).toContain("simple.")
    expect(markup).toContain("UpClass")
    expect(markup).not.toContain("Classroom workspace")
    expect(markup).toContain("How it helps")
    expect(markup).toContain("Learning made better.")
    expect(markup).toContain("landing-hero-accent")
    expect(markup).toContain('href="/sign-up"')
    expect(markup).toContain('aria-label="UpClass workspace preview"')
    expect(markup).toContain("COURSE WORKSPACE")
    expect(markup).toContain("Stream")
    expect(markup).toContain("Classwork")
    expect(markup).toContain("Whiteboard")
    expect(markup).toContain("Announcements and updates for this course.")
    expect(markup).toContain("Everything around a lesson, in one place.")
    expect(markup).toContain("Start small. Keep the work clear.")
    expect(markup).toContain("Your classroom already has enough moving parts.")
  })
})
