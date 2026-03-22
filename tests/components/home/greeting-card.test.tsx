import { render, screen } from "@testing-library/react"

import { GreetingCard } from "@/components/home/greeting-card"

describe("GreetingCard", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a morning greeting and role-specific message for teachers", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(8)

    render(<GreetingCard userName="Ada Lovelace" role="teacher" />)

    expect(screen.getByRole("heading", { name: "Good morning, Ada!" })).toBeInTheDocument()
    expect(screen.getByText("Welcome Back")).toBeInTheDocument()
    expect(screen.getByText(expectedMotivationalMessage("teacher", "Ada Lovelace"))).toBeInTheDocument()
  })

  it("falls back to a generic greeting for unnamed students at night", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(22)

    render(<GreetingCard userName="" role={null} />)

    expect(screen.getByRole("heading", { name: "Good night, there!" })).toBeInTheDocument()
    expect(screen.getByText(expectedMotivationalMessage("student", ""))).toBeInTheDocument()
  })
})

function expectedMotivationalMessage(
  role: "teacher" | "student",
  userName: string,
) {
  const messages = {
    teacher: [
      "Ready to inspire your students today?",
      "Let's make learning amazing today!",
      "Your students are waiting for your guidance!",
      "Your impact goes beyond the classroom.",
      "Make today a masterpiece!",
    ],
    student: [
      "Ready to learn something new?",
      "Let's crush those assignments today!",
      "Every day is a chance to grow!",
      "Knowledge is power. Go get it!",
      "Small steps lead to big progress.",
    ],
  } as const

  const seed = `${role}:${userName}`
  const hash = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0)
  return messages[role][hash % messages[role].length]
}
