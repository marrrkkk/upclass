import { render, screen } from "@testing-library/react"

import { UrlLinkify } from "@/components/messages/url-linkify"

describe("UrlLinkify", () => {
  it("renders plain text without links", () => {
    render(<UrlLinkify text="No links here" />)

    expect(screen.getByText("No links here")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("converts URLs into accessible external links", () => {
    render(<UrlLinkify text="Read https://example.com/docs today" />)

    const link = screen.getByRole("link", { name: /https:\/\/example\.com\/docs/i })

    expect(link).toHaveAttribute("href", "https://example.com/docs")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByText(/Read/)).toBeInTheDocument()
    expect(screen.getByText(/today/)).toBeInTheDocument()
  })

  it("renders multiple links in mixed content", () => {
    render(<UrlLinkify text="Docs https://example.com and site https://upclass.dev" />)

    expect(screen.getByRole("link", { name: /https:\/\/example\.com/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /https:\/\/upclass\.dev/i })).toBeInTheDocument()
  })
})
