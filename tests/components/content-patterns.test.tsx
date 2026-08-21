import { render, screen } from "@testing-library/react"
import { Bell, BookOpen } from "lucide-react"

import { EntityRow } from "@/components/ui/entity-row"
import { FilterToolbar } from "@/components/ui/filter-toolbar"
import { ResponsiveSplitView } from "@/components/ui/responsive-split-view"
import { TimelineRow } from "@/components/ui/timeline-row"

describe("shared content patterns", () => {
  it("renders an entity row with a primary target and separate actions", () => {
    render(
      <EntityRow
        href="/academy/resources/resource-1"
        media={<BookOpen />}
        title="Course handbook"
        description="PDF · 2 MB"
        metadata="Updated today"
        actions={<button type="button">More actions</button>}
      />,
    )

    expect(screen.getByRole("link", { name: /Course handbook/i })).toHaveAttribute(
      "href",
      "/academy/resources/resource-1",
    )
    expect(screen.getByRole("link", { name: /Course handbook/i })).not.toContainElement(
      screen.getByRole("button", { name: "More actions" }),
    )
  })

  it("groups filters and actions in a labeled toolbar", () => {
    render(
      <FilterToolbar label="Resource filters" filters={<input aria-label="Search resources" />} actions={<button>Upload</button>} />,
    )

    expect(screen.getByRole("search", { name: "Resource filters" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument()
  })

  it("renders a linked timeline event with readable state and time", () => {
    render(
      <TimelineRow
        href="/academy/classes/class-1"
        icon={<Bell />}
        title="New announcement"
        description="Design systems class"
        timestamp="5 minutes ago"
        unread
      />,
    )

    expect(screen.getByRole("link", { name: /New announcement/i })).toHaveAttribute(
      "data-unread",
      "true",
    )
    expect(screen.getByText("5 minutes ago")).toBeInTheDocument()
  })

  it("labels the list and detail regions in a split workspace", () => {
    render(
      <ResponsiveSplitView
        listLabel="Conversations"
        detailLabel="Conversation"
        list={<p>Thread list</p>}
        detail={<p>Selected thread</p>}
      />,
    )

    expect(screen.getByRole("region", { name: "Conversations" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Conversation" })).toBeInTheDocument()
  })
})
