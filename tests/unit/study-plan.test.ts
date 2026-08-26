import { describe, expect, it } from "vitest"

import { buildStudyPlanPrompt, studyPlanSchema, type StudyPlanFacts } from "@/lib/ai/study-plan"

const facts: StudyPlanFacts = {
  firstName: "Ada",
  spaces: [
    { title: "Biology — Cells", totalCards: 40, dueNext7Days: 12, accuracy14d: 0.62 },
    { title: "History — Rome", totalCards: 10, dueNext7Days: 0, accuracy14d: null },
  ],
  deadlines: [{ title: "Cell diagram lab", className: "Biology", dueInDays: 3 }],
}

describe("buildStudyPlanPrompt", () => {
  it("includes spaces with accuracy, due counts, and deadlines", () => {
    const prompt = buildStudyPlanPrompt(facts)
    expect(prompt).toContain("Ada")
    expect(prompt).toContain("Biology — Cells")
    expect(prompt).toContain("62% correct recently")
    expect(prompt).toContain("no reviews yet")
    expect(prompt).toContain('"Cell diagram lab" (Biology) due in 3 day(s)')
  })

  it("degrades gracefully with no data", () => {
    const empty = buildStudyPlanPrompt({ firstName: "Sam", spaces: [], deadlines: [] })
    expect(empty).toContain("No study spaces yet")
    expect(empty).toContain("None within two weeks")
  })
})

describe("studyPlanSchema", () => {
  it("accepts a well-formed plan", () => {
    const plan = {
      summary: "Focus on Biology this week.",
      focusAreas: ["Cell structure"],
      days: [{ label: "Mon", items: ["Review 12 due cards in Biology — Cells"] }],
    }
    expect(studyPlanSchema.safeParse(plan).success).toBe(true)
  })

  it("rejects plans without days or oversized fields", () => {
    expect(studyPlanSchema.safeParse({ summary: "s", focusAreas: [], days: [] }).success).toBe(false)
    expect(
      studyPlanSchema.safeParse({
        summary: "x".repeat(500),
        focusAreas: [],
        days: [{ label: "Mon", items: ["a"] }],
      }).success,
    ).toBe(false)
  })

  it("caps focus areas and daily items", () => {
    const tooMany = {
      summary: "ok summary here",
      focusAreas: ["a", "b", "c", "d", "e"],
      days: [{ label: "Mon", items: ["1", "2", "3", "4", "5"] }],
    }
    expect(studyPlanSchema.safeParse(tooMany).success).toBe(false)
  })
})
