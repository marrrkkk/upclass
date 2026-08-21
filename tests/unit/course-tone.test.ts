import { courseToneFromValue, COURSE_TONES } from "@/lib/design-system"

describe("course tones", () => {
  it("maps stored colors to a finite contrast-tested palette", () => {
    const tone = courseToneFromValue("#0e6b52", "class-1")

    expect(COURSE_TONES).toContain(tone)
    expect(courseToneFromValue("#0e6b52", "class-1")).toBe(tone)
  })

  it("uses the entity key as a deterministic fallback", () => {
    expect(courseToneFromValue(null, "class-1")).toBe(courseToneFromValue(undefined, "class-1"))
    expect(COURSE_TONES).toContain(courseToneFromValue("not-a-color", "class-2"))
  })
})
