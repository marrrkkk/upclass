// @vitest-environment node

import { describe, expect, test } from "vitest"

import { isStructuredCard, structuredCardFromOutput } from "@/lib/ai/tools/structured-outputs"

describe("isStructuredCard", () => {
  test("accepts a valid card", () => {
    expect(
      isStructuredCard({
        _type: "classes_list",
        title: "Your classes",
        items: [],
      }),
    ).toBe(true)
  })

  test("rejects unknown card types", () => {
    expect(isStructuredCard({ _type: "nonsense", title: "x", items: [] })).toBe(false)
  })

  test("rejects non-objects and missing items", () => {
    expect(isStructuredCard(null)).toBe(false)
    expect(isStructuredCard("text")).toBe(false)
    expect(isStructuredCard({ _type: "classwork_list", title: "x" })).toBe(false)
  })

  test("rejects nested cards (no nesting support)", () => {
    expect(
      isStructuredCard({ _type: "quiz_details", title: "x", items: [] }),
    ).toBe(true)
  })
})

describe("structuredCardFromOutput", () => {
  test("extracts the card from executor output", () => {
    const card = { _type: "student_overview" as const, title: "t", items: [] }
    expect(
      structuredCardFromOutput({ text: "done", structured: card }),
    ).toEqual(card)
  })

  test("returns null when no structured output", () => {
    expect(structuredCardFromOutput({ text: "done" })).toBeNull()
    expect(
      structuredCardFromOutput({ text: "done", structured: { _type: "bad" as const } }),
    ).toBeNull()
  })
})