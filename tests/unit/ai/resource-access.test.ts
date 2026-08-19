// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

// Chain helper: query 1 ends at .where() (no limit), query 2 ends at
// .limit(1). The where chain is thenable AND exposes .limit so both shapes
// resolve through the same selectLimitMock queue.
function makeChain() {
  const chain = {
    limit: selectLimitMock,
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(selectLimitMock()).then(onFulfilled),
  }
  return chain
}

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => makeChain())
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock("@/db", () => ({
  db: { select: selectMock },
}))

describe("resolveResourceAccess", () => {
  let resolveResourceAccess: typeof import("@/lib/ai/access").resolveResourceAccess

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import("@/lib/ai/access")
    resolveResourceAccess = mod.resolveResourceAccess
  })

  test("the resource owner always has access (no db queries)", async () => {
    const allowed = await resolveResourceAccess("user-1", { id: "res-1", ownerId: "user-1" })
    expect(allowed).toBe(true)
    expect(selectMock).not.toHaveBeenCalled()
  })

  test("a user sharing an org with the owner has access", async () => {
    selectLimitMock
      .mockResolvedValueOnce([{ orgId: "org-1" }, { orgId: "org-2" }]) // owner's orgs
      .mockResolvedValueOnce([{ orgId: "org-2" }]) // shared membership
    const allowed = await resolveResourceAccess("user-2", { id: "res-1", ownerId: "user-1" })
    expect(allowed).toBe(true)
  })

  test("no shared org means no access", async () => {
    selectLimitMock
      .mockResolvedValueOnce([{ orgId: "org-1" }]) // owner's orgs
      .mockResolvedValueOnce([]) // requester in none of them
    const allowed = await resolveResourceAccess("user-3", { id: "res-1", ownerId: "user-1" })
    expect(allowed).toBe(false)
  })

  test("an owner with no org memberships blocks everyone else", async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const allowed = await resolveResourceAccess("user-3", { id: "res-1", ownerId: "user-1" })
    expect(allowed).toBe(false)
  })
})