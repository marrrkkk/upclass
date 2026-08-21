import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

import { RecentClasses, type ClassItem } from "@/components/home/recent-classes"

vi.mock("next/navigation", () => ({
  usePathname: () => "/acme-academy/dashboard",
}))

describe("RecentClasses", () => {
  const sampleClasses: ClassItem[] = [
    {
      id: "cls-1",
      title: "AP Literature & Composition",
      description: "Advanced literary analysis and writing",
      category: "English",
      color: "emerald",
      memberCount: 24,
      role: "teacher",
    },
    {
      id: "cls-2",
      title: "Calculus BC",
      description: "College-level calculus",
      category: "Math",
      color: "blue",
      memberCount: 18,
      role: "student",
    },
  ]

  it("renders class workspace cards with title, category, role badge, student count, and tabs", () => {
    render(<RecentClasses classes={sampleClasses} userRole="teacher" />)

    expect(screen.getByText("Course overview")).toBeInTheDocument()
    expect(screen.getByText("2 active classes.")).toBeInTheDocument()

    // First class check
    expect(screen.getByText("AP Literature & Composition")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("Teaching")).toBeInTheDocument()
    expect(screen.getByText("24 students")).toBeInTheDocument()

    // Second class check
    expect(screen.getByText("Calculus BC")).toBeInTheDocument()
    expect(screen.getByText("Math")).toBeInTheDocument()
    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.getByText("18 students")).toBeInTheDocument()

    // Open class links
    const openLinks = screen.getAllByRole("link", { name: /Open class/i })
    expect(openLinks[0]).toHaveAttribute("href", "/acme-academy/classes/cls-1")
    expect(openLinks[1]).toHaveAttribute("href", "/acme-academy/classes/cls-2")

    // Stream, Work, Board sublinks
    const streamLinks = screen.getAllByRole("link", { name: /Stream/i })
    expect(streamLinks[0]).toHaveAttribute("href", "/acme-academy/classes/cls-1?tab=stream")

    const workLinks = screen.getAllByRole("link", { name: /Work/i })
    expect(workLinks[0]).toHaveAttribute("href", "/acme-academy/classes/cls-1?tab=classwork")

    const boardLinks = screen.getAllByRole("link", { name: /Board/i })
    expect(boardLinks[0]).toHaveAttribute("href", "/acme-academy/classes/cls-1?tab=whiteboard")
  })

  it("renders an empty state with action link when user has no classes", () => {
    render(<RecentClasses classes={[]} userRole="teacher" />)

    expect(screen.getByText("No active classes")).toBeInTheDocument()
    expect(screen.getByText("Create your first class to add coursework and invite students.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Create a class/i })).toHaveAttribute(
      "href",
      "/acme-academy/classes",
    )
  })

  it("opens the all-classes dialog when View all is clicked", async () => {
    const user = userEvent.setup()
    render(<RecentClasses classes={sampleClasses} userRole="teacher" />)

    const viewAllBtn = screen.getByRole("button", { name: /View all/i })
    await user.click(viewAllBtn)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("You are teaching 2 classes.")).toBeInTheDocument()
  })
})
