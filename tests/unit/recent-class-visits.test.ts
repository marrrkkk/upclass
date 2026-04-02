import { describe, expect, it } from "vitest"

import {
  recordRecentClassVisit,
  sortItemsByRecentClassVisit,
} from "@/lib/recent-class-visits"

describe("recent class visits", () => {
  it("puts the most recently opened class first", () => {
    const classes = [
      { id: "class-a", title: "Class A" },
      { id: "class-b", title: "Class B" },
      { id: "class-c", title: "Class C" },
    ]

    recordRecentClassVisit("class-a")
    recordRecentClassVisit("class-c")

    expect(sortItemsByRecentClassVisit(classes, (item) => item.id).map((item) => item.id)).toEqual([
      "class-c",
      "class-a",
      "class-b",
    ])
  })

  it("keeps original order for classes with no local visit history", () => {
    const classes = [
      { id: "class-a", title: "Class A" },
      { id: "class-b", title: "Class B" },
    ]

    expect(sortItemsByRecentClassVisit(classes, (item) => item.id)).toEqual(classes)
  })
})
