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

    expect(markup).toContain("Make classwork")
    expect(markup).toContain("feel lighter.")
    expect(markup).toContain("UpClass is still in beta")
    expect(markup).toContain("UpClass")
    expect(markup).not.toContain("Classroom workspace")
    expect(markup).toContain("What")
    expect(markup).toContain('href="/sign-up"')
    expect(markup).toContain('aria-label="UpClass class workspace preview"')
    expect(markup).toContain("COURSE WORKSPACE")
    expect(markup).toContain("Stream")
    expect(markup).toContain("Classwork")
    expect(markup).toContain("Quick to open")
    expect(markup).toContain("Open the door.")
  })
})
