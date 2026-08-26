// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  needsAccountSetup: vi.fn(),
  listUserOrganizations: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/app/actions/onboarding", () => ({
  needsAccountSetup: mocks.needsAccountSetup,
}))

vi.mock("@/app/actions/organization", () => ({
  listUserOrganizations: mocks.listUserOrganizations,
}))

import { GET } from "@/app/entry/route"

function makeRequest(cookie?: [string, string]) {
  const request = new NextRequest("http://localhost/entry")
  if (cookie) request.cookies.set(cookie[0], cookie[1])
  return request
}

const org = (slug: string) => ({
  id: `org-${slug}`,
  name: slug,
  slug,
  description: null,
  logo: null,
  cover: null,
  role: "teacher" as const,
  memberCount: 3,
})

describe("GET /entry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.needsAccountSetup.mockResolvedValue(false)
    mocks.listUserOrganizations.mockResolvedValue({ success: true, data: [] })
  })

  test("redirects unauthenticated visitors to sign in", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost/sign-in")
    expect(mocks.listUserOrganizations).not.toHaveBeenCalled()
  })

  test("sends incomplete accounts to account setup", async () => {
    mocks.needsAccountSetup.mockResolvedValue(true)

    const response = await GET(makeRequest())

    expect(response.headers.get("location")).toBe("http://localhost/org/setup?scope=account")
    expect(mocks.listUserOrganizations).not.toHaveBeenCalled()
  })

  test("sends users without organizations to the workspace list", async () => {
    const response = await GET(makeRequest())

    expect(response.headers.get("location")).toBe("http://localhost/org")
  })

  test("opens the only organization directly", async () => {
    mocks.listUserOrganizations.mockResolvedValue({
      success: true,
      data: [org("academy")],
    })

    const response = await GET(makeRequest())

    expect(response.headers.get("location")).toBe("http://localhost/academy/dashboard")
  })

  test("opens the most recently opened organization", async () => {
    mocks.listUserOrganizations.mockResolvedValue({
      success: true,
      data: [org("academy"), org("north")],
    })

    const response = await GET(makeRequest(["upclass-last-org", "north"]))

    expect(response.headers.get("location")).toBe("http://localhost/north/dashboard")
  })

  test("falls back to the workspace list when no organization was opened", async () => {
    mocks.listUserOrganizations.mockResolvedValue({
      success: true,
      data: [org("academy"), org("north")],
    })

    const response = await GET(makeRequest())

    expect(response.headers.get("location")).toBe("http://localhost/org")
  })

  test("falls back to the workspace list when the recorded organization is stale", async () => {
    mocks.listUserOrganizations.mockResolvedValue({
      success: true,
      data: [org("academy"), org("north")],
    })

    const response = await GET(makeRequest(["upclass-last-org", "removed-org"]))

    expect(response.headers.get("location")).toBe("http://localhost/org")
  })

  test("falls back to the workspace list when organizations fail to load", async () => {
    mocks.listUserOrganizations.mockResolvedValue({ success: false, error: "Failed" })

    const response = await GET(makeRequest())

    expect(response.headers.get("location")).toBe("http://localhost/org")
  })
})
