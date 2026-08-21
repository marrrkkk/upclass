import { render, screen } from "@testing-library/react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import type { ActivityLogItem } from "@/lib/activity-ui"

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

const activity: ActivityLogItem = {
  id: "activity-1",
  eventType: "assignment_submitted",
  title: "Submitted architecture reflection",
  description: "Week four coursework",
  occurredAt: "2026-03-01T10:00:00.000Z",
  classId: "class-1",
  className: "Software Architecture",
  href: "/classes/class-1#classwork",
  category: "coursework",
}

describe("ActivityLogList", () => {
  it("renders the shared empty state with focused copy", () => {
    render(
      <ActivityLogList
        items={[]}
        emptyTitle="No matching activity"
        emptyDescription="Choose another filter."
      />,
    )

    expect(screen.getByText("No matching activity")).toBeInTheDocument()
    expect(screen.getByText("Choose another filter.")).toBeInTheDocument()
  })

  it("renders a timestamped timeline row with a tenant-aware target", () => {
    const { container } = render(<ActivityLogList items={[activity]} />)

    expect(screen.getByRole("list", { name: "Activity timeline" })).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /submitted architecture reflection/i }),
    ).toHaveAttribute("href", "/academy/classes/class-1#classwork")
    expect(screen.getByText("Software Architecture")).toBeInTheDocument()
    expect(container.querySelector("time")).toHaveAttribute("datetime", activity.occurredAt)
  })
})
