import { describe, expect, test } from "vitest"

import {
  canCreateClass,
  canManageOrganization,
  canTeach,
  normalizeOrgRole,
  orgRoleAsClassRole,
} from "@/lib/org-permissions"

describe("org permissions", () => {
  test("legacy member maps to student", () => {
    expect(normalizeOrgRole("member")).toBe("student")
  })

  test("teachers can create classes", () => {
    expect(canCreateClass("teacher")).toBe(true)
    expect(canCreateClass("admin")).toBe(true)
    expect(canCreateClass("student")).toBe(false)
    expect(canCreateClass("member")).toBe(false)
  })

  test("org admin surfaces as teacher in AI", () => {
    expect(orgRoleAsClassRole("admin")).toBe("teacher")
    expect(orgRoleAsClassRole("student")).toBe("student")
  })

  test("only owners and admins manage organization", () => {
    expect(canManageOrganization("owner")).toBe(true)
    expect(canManageOrganization("teacher")).toBe(false)
    expect(canTeach("teacher")).toBe(true)
  })
})
