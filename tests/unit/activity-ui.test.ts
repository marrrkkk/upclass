import {
  activityFilters,
  getActivityCategory,
  getActivityLevel,
} from "@/lib/activity-ui"

describe("activity-ui", () => {
  it("maps activity counts into the expected heatmap levels", () => {
    expect(getActivityLevel(-3)).toBe(0)
    expect(getActivityLevel(0)).toBe(0)
    expect(getActivityLevel(1)).toBe(1)
    expect(getActivityLevel(2)).toBe(2)
    expect(getActivityLevel(3)).toBe(3)
    expect(getActivityLevel(4)).toBe(3)
    expect(getActivityLevel(5)).toBe(4)
    expect(getActivityLevel(12)).toBe(4)
  })

  it("maps event types to the correct activity category", () => {
    expect(getActivityCategory("class_created")).toBe("classes")
    expect(getActivityCategory("class_joined")).toBe("classes")
    expect(getActivityCategory("assignment_submitted")).toBe("coursework")
    expect(getActivityCategory("quiz_submitted")).toBe("coursework")
    expect(getActivityCategory("resource_uploaded")).toBe("resources")
    expect(getActivityCategory("anything_else")).toBe("teaching")
  })

  it("exposes the activity filters in the expected order", () => {
    expect(activityFilters).toEqual([
      { value: "all", label: "All" },
      { value: "classes", label: "Classes" },
      { value: "teaching", label: "Teaching" },
      { value: "coursework", label: "Coursework" },
      { value: "resources", label: "Resources" },
    ])
  })
})
