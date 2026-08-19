import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import {
  firstName,
  formatDueDate,
  formatDueDateFull,
  formatRelativeTime,
  formatDateTime,
  formatDateLabel,
  getGreeting,
  pluralize,
  formatCount,
} from "@/components/home/dashboard/dashboard-formatters"

describe("Dashboard Formatters", () => {
  describe("firstName", () => {
    it("extracts first name from full name", () => {
      expect(firstName("John Doe")).toBe("John")
      expect(firstName("Alice Marie Smith")).toBe("Alice")
    })

    it("handles single name", () => {
      expect(firstName("Madonna")).toBe("Madonna")
    })

    it("handles empty or whitespace-only names", () => {
      expect(firstName("")).toBe("there")
      expect(firstName("   ")).toBe("there")
    })

    it("trims whitespace", () => {
      expect(firstName("  John  Doe  ")).toBe("John")
    })
  })

  describe("formatDueDate", () => {
    it("formats date as short month and day", () => {
      const date = new Date(2026, 0, 15) // January 15, 2026
      expect(formatDueDate(date)).toMatch(/Jan 15/)
    })

    it("handles string dates", () => {
      const dateString = "2026-03-20"
      expect(formatDueDate(dateString)).toMatch(/Mar 20/)
    })

    it("returns fallback for invalid dates", () => {
      expect(formatDueDate("invalid")).toBe("No due date")
      expect(formatDueDate(new Date("invalid"))).toBe("No due date")
    })
  })

  describe("formatDueDateFull", () => {
    let originalDate: typeof Date
    let mockNow: Date

    beforeEach(() => {
      originalDate = global.Date
      mockNow = new Date(2026, 0, 15, 12, 0, 0) // January 15, 2026, noon
      global.Date = class MockDate extends originalDate {
        constructor(...args: unknown[]) {
          super()
          if (args.length === 0) {
            return mockNow as unknown as MockDate
          }
          return new originalDate(...(args as ConstructorParameters<typeof originalDate>)) as unknown as MockDate
        }
        static now() {
          return mockNow.getTime()
        }
      } as DateConstructor
    })

    afterEach(() => {
      global.Date = originalDate
    })

    it("formats today's date as 'Due today'", () => {
      const today = new Date(2026, 0, 15) // Same day as mockNow
      expect(formatDueDateFull(today)).toBe("Due today")
    })

    it("formats tomorrow's date as 'Due tomorrow'", () => {
      const tomorrow = new Date(2026, 0, 16)
      expect(formatDueDateFull(tomorrow)).toBe("Due tomorrow")
    })

    it("formats future dates with month and day", () => {
      const future = new Date(2026, 0, 20)
      expect(formatDueDateFull(future)).toMatch(/Due Jan 20/)
    })

    it("returns fallback for invalid dates", () => {
      expect(formatDueDateFull("invalid")).toBe("No due date")
    })
  })

  describe("formatRelativeTime", () => {
    let originalDate: typeof Date
    let mockNow: Date

    beforeEach(() => {
      originalDate = global.Date
      mockNow = new Date(2026, 0, 15, 12, 0, 0)
      vi.useFakeTimers()
      vi.setSystemTime(mockNow)
    })

    afterEach(() => {
      vi.useRealTimers()
      global.Date = originalDate
    })

    it("formats recent time as 'Just now'", () => {
      const recent = new Date(mockNow.getTime() - 30 * 1000) // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe("Just now")
    })

    it("formats minutes ago", () => {
      const minutes = new Date(mockNow.getTime() - 5 * 60 * 1000) // 5 minutes ago
      expect(formatRelativeTime(minutes)).toBe("5m ago")
    })

    it("formats hours ago", () => {
      const hours = new Date(mockNow.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
      expect(formatRelativeTime(hours)).toBe("3h ago")
    })

    it("formats days ago", () => {
      const days = new Date(mockNow.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      expect(formatRelativeTime(days)).toBe("2d ago")
    })

    it("formats weeks as date", () => {
      const weeks = new Date(mockNow.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      expect(formatRelativeTime(weeks)).toMatch(/Jan/)
    })

    it("returns fallback for invalid dates", () => {
      expect(formatRelativeTime("invalid")).toBe("Unknown time")
    })
  })

  describe("formatDateTime", () => {
    it("formats date with time", () => {
      const date = new Date(2026, 0, 15, 14, 30) // January 15, 2026, 2:30 PM
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/Jan 15/)
      expect(formatted).toMatch(/2:30/)
    })

    it("returns fallback for invalid dates", () => {
      expect(formatDateTime("invalid")).toBe("Unknown time")
    })
  })

  describe("formatDateLabel", () => {
    it("formats date as full day and date", () => {
      const date = new Date(2026, 0, 15) // January 15, 2026 (Thursday)
      const formatted = formatDateLabel(date)
      expect(formatted).toMatch(/Thursday/)
      expect(formatted).toMatch(/January/)
      expect(formatted).toMatch(/15/)
    })

    it("uses current date when no argument provided", () => {
      const formatted = formatDateLabel()
      expect(formatted).toMatch(/\w+, \w+ \d+/)
    })
  })

  describe("getGreeting", () => {
    it("returns 'Good late night' for early morning hours (midnight-5am)", () => {
      const lateNight = new Date(2026, 0, 15, 2, 0) // 2 AM
      expect(getGreeting(lateNight)).toBe("Good late night")
    })

    it("returns 'Good morning' for morning hours (5am-noon)", () => {
      const morning = new Date(2026, 0, 15, 9, 0) // 9 AM
      expect(getGreeting(morning)).toBe("Good morning")
    })

    it("returns 'Good afternoon' for afternoon hours (noon-5pm)", () => {
      const afternoon = new Date(2026, 0, 15, 14, 0) // 2 PM
      expect(getGreeting(afternoon)).toBe("Good afternoon")
    })

    it("returns 'Good evening' for evening hours (5pm-9pm)", () => {
      const evening = new Date(2026, 0, 15, 19, 0) // 7 PM
      expect(getGreeting(evening)).toBe("Good evening")
    })

    it("returns 'Good night' for night hours (9pm-midnight)", () => {
      const night = new Date(2026, 0, 15, 22, 0) // 10 PM
      expect(getGreeting(night)).toBe("Good night")
    })

    it("uses current time when no argument provided", () => {
      const greeting = getGreeting()
      expect(["Good late night", "Good morning", "Good afternoon", "Good evening", "Good night"]).toContain(greeting)
    })
  })

  describe("pluralize", () => {
    it("returns singular for count of 1", () => {
      expect(pluralize(1, "item")).toBe("item")
      expect(pluralize(1, "class")).toBe("class")
    })

    it("returns default plural for other counts", () => {
      expect(pluralize(0, "item")).toBe("items")
      expect(pluralize(2, "item")).toBe("items")
      expect(pluralize(10, "item")).toBe("items")
    })

    it("uses custom plural when provided", () => {
      expect(pluralize(2, "class", "classes")).toBe("classes")
      expect(pluralize(3, "person", "people")).toBe("people")
    })

    it("handles edge cases", () => {
      expect(pluralize(1, "child", "children")).toBe("child")
      expect(pluralize(2, "child", "children")).toBe("children")
    })
  })

  describe("formatCount", () => {
    it("formats count with singular noun", () => {
      expect(formatCount(1, "item")).toBe("1 item")
      expect(formatCount(1, "class")).toBe("1 class")
    })

    it("formats count with plural noun", () => {
      expect(formatCount(0, "item")).toBe("0 items")
      expect(formatCount(2, "item")).toBe("2 items")
      expect(formatCount(10, "item")).toBe("10 items")
    })

    it("uses custom plural when provided", () => {
      expect(formatCount(1, "person", "people")).toBe("1 person")
      expect(formatCount(5, "person", "people")).toBe("5 people")
    })
  })
})
