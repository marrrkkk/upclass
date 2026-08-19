import { describe, expect, it } from "vitest"

import {
  CLASS_DETAIL_TABS,
  getVisibleClassTab,
  getVisibleTabs,
} from "@/lib/classes/class-detail-tabs"

describe("getVisibleTabs", () => {
  it("includes the gradebook for teachers", () => {
    expect(getVisibleTabs("teacher")).toEqual([
      "stream",
      "classwork",
      "quizzes",
      "gradebook",
      "people",
    ])
  })

  it("excludes the gradebook for students", () => {
    expect(getVisibleTabs("student")).toEqual(["stream", "classwork", "quizzes", "people"])
  })

  it("defaults to the student-visible set without a role", () => {
    expect(getVisibleTabs(null)).toEqual(["stream", "classwork", "quizzes", "people"])
  })

  it("keeps CLASS_DETAIL_TABS as the full superset", () => {
    expect(CLASS_DETAIL_TABS).toEqual([
      "stream",
      "classwork",
      "quizzes",
      "gradebook",
      "people",
    ])
  })
})

describe("getVisibleClassTab", () => {
  it("resolves visible tabs for any role", () => {
    expect(getVisibleClassTab("classwork", "stream", "teacher")).toBe("classwork")
    expect(getVisibleClassTab("quizzes", "stream", "student")).toBe("quizzes")
  })

  it("allows the gradebook for teachers", () => {
    expect(getVisibleClassTab("gradebook", "stream", "teacher")).toBe("gradebook")
  })

  it("treats an unknown role like a student", () => {
    expect(getVisibleClassTab("gradebook", "stream")).toBe("stream")
  })

  it("falls back when a student requests the gradebook", () => {
    expect(getVisibleClassTab("gradebook", "stream", "student")).toBe("stream")
    expect(getVisibleClassTab("gradebook", "quizzes", "student")).toBe("quizzes")
  })

  it("falls back to the fallback tab for unknown requests", () => {
    expect(getVisibleClassTab("settings", "stream", "teacher")).toBe("stream")
    expect(getVisibleClassTab(null, "people", "student")).toBe("people")
  })
})