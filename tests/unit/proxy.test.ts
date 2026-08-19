import { NextRequest } from "next/server"

import { isPublicRoute, proxy } from "@/proxy"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  validateOrgAccess: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("@/lib/org-validation", () => ({
  validateOrgAccess: mocks.validateOrgAccess,
}))

describe("tenant proxy routing", () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.validateOrgAccess.mockReset()
  })

  it("matches the root exactly instead of treating every path as public", () => {
    expect(isPublicRoute("/")).toBe(true)
    expect(isPublicRoute("/sign-in")).toBe(true)
    expect(isPublicRoute("/api/users/by-email")).toBe(true)
    expect(isPublicRoute("/academy/home")).toBe(false)
    expect(isPublicRoute("/sign-injected")).toBe(false)
  })

  it("redirects an unauthenticated tenant deep link to sign in", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await proxy(
      new NextRequest("http://localhost/academy/classes/class-1"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost/sign-in?from=%2Facademy%2Fclasses%2Fclass-1",
    )
    expect(mocks.validateOrgAccess).not.toHaveBeenCalled()
  })

  it("validates organization access for an authenticated tenant route", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.validateOrgAccess.mockResolvedValue({ valid: true })

    const response = await proxy(new NextRequest("http://localhost/academy/home"))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(mocks.validateOrgAccess).toHaveBeenCalledWith("user-1", "academy")
  })
})
