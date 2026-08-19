// @vitest-environment node

import { describe, expect, test } from "vitest"

import {
  MAX_ACTION_TOOLS_PER_TURN,
  MAX_READ_TOOLS_PER_TURN,
  isStructuredToolName,
  selectToolNames,
} from "@/lib/ai/orchestrator/tool-selector"

describe("selectToolNames", () => {
  test("caps read tools per turn", () => {
    const names = selectToolNames({ intent: "data_query", role: "student" })
    expect(names.length).toBeLessThanOrEqual(MAX_READ_TOOLS_PER_TURN)
    expect(names.length).toBeGreaterThan(0)
  })

  test("applies tighter caps for analytics turns", () => {
    const names = selectToolNames({ intent: "analytics", role: "student" })
    expect(names.length).toBeLessThanOrEqual(4)
  })

  test("offers action tools only to teachers on action intents", () => {
    const teacher = selectToolNames({ intent: "classwork_action", role: "teacher" })
    expect(teacher.some((name) => name.startsWith("draft_") || name === "create_assignment" || name === "create_quiz")).toBe(true)
    expect(teacher.length).toBeLessThanOrEqual(
      MAX_READ_TOOLS_PER_TURN + MAX_ACTION_TOOLS_PER_TURN,
    )

    const student = selectToolNames({ intent: "classwork_action", role: "student" })
    expect(student.some((name) => name === "create_assignment" || name === "create_quiz")).toBe(false)
  })

  test("no action tools on query-only intents", () => {
    const names = selectToolNames({ intent: "analytics", role: "teacher" })
    expect(names.some((name) => name.startsWith("draft_") || name === "create_assignment")).toBe(false)
  })

  test("forceToolNames are appended when valid", () => {
    const names = selectToolNames({
      intent: "general_question",
      role: "student",
      forceToolNames: ["list_classes", "not_a_tool"],
    })
    expect(names).toContain("list_classes")
    expect(names).not.toContain("not_a_tool")
  })

  test("deduplicates", () => {
    const names = selectToolNames({
      intent: "data_query",
      role: "student",
      forceToolNames: ["list_classes", "list_classes"],
    })
    expect(new Set(names).size).toBe(names.length)
  })
})

describe("isStructuredToolName", () => {
  test("recognizes structured output tools", () => {
    expect(isStructuredToolName("list_classes")).toBe(true)
    expect(isStructuredToolName("draft_announcement")).toBe(false)
  })
})