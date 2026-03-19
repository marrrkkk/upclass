import { getInitials, getPresenceColor } from "@/whiteboard/utils/presence"

describe("whiteboard presence helpers", () => {
  it("returns a stable color from the presence palette for the same user id", () => {
    const first = getPresenceColor("user-123")
    const second = getPresenceColor("user-123")

    expect(first).toBe(second)
    expect([
      "#2563eb",
      "#dc2626",
      "#16a34a",
      "#9333ea",
      "#ea580c",
      "#0891b2",
      "#4f46e5",
      "#ca8a04",
    ]).toContain(first)
  })

  it("derives initials from names with extra spacing", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL")
    expect(getInitials("  Grace   Hopper  ")).toBe("GH")
    expect(getInitials("plato")).toBe("P")
    expect(getInitials("")).toBe("")
  })
})
