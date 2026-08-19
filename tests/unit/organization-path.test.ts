import { organizationPath, organizationSlugFromPathname } from "@/lib/organization-path"

describe("organization paths", () => {
  it("builds a normalized path inside an organization", () => {
    expect(organizationPath("north-academy", "/messages")).toBe("/north-academy/messages")
    expect(organizationPath("north-academy", "classes/class-1")).toBe(
      "/north-academy/classes/class-1",
    )
  })

  it("does not duplicate separators or an existing organization prefix", () => {
    expect(organizationPath("north-academy", "//settings")).toBe("/north-academy/settings")
    expect(organizationPath("north-academy", "/north-academy/home")).toBe(
      "/north-academy/home",
    )
  })

  it("falls back to a root-relative path when no organization is available", () => {
    expect(organizationPath(null, "messages")).toBe("/messages")
  })

  it("extracts the tenant segment from an organization route", () => {
    expect(organizationSlugFromPathname("/north-academy/classes/class-1")).toBe(
      "north-academy",
    )
    expect(organizationSlugFromPathname(null)).toBeNull()
  })
})
