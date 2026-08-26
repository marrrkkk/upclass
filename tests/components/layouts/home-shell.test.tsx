import { render, screen } from "@testing-library/react"

import { HomeShell } from "@/components/layouts/home-shell"

vi.mock("@/components/ai/ai-panel-provider", () => ({
  AiPanelProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useAiPanel: () => ({
    setContext: vi.fn(),
    clearSeed: vi.fn(),
    open: false,
    setOpen: vi.fn(),
  }),
}))

vi.mock("@/components/layouts/background-refresh-client", () => ({
  BackgroundRefreshClient: () => null,
}))

vi.mock("@/components/layouts/navigation-progress", () => ({
  NavigationProgress: () => null,
}))

vi.mock("@/components/layouts/app-command-menu", () => ({
  AppCommandMenu: () => null,
  openAppCommandMenu: vi.fn(),
}))

vi.mock("@/components/ai/ai-side-panel", () => ({
  AiSidePanel: () => null,
}))

vi.mock("@/components/page-header", () => ({
  PageHeader: ({ user }: { user: { name: string | null } }) => (
    <span>{user.name}</span>
  ),
}))

function renderShell(props: Partial<Parameters<typeof HomeShell>[0]> = {}) {
  return render(
    <HomeShell isAuthenticated={false} {...props}>
      <p>Page content</p>
    </HomeShell>,
  )
}

describe("HomeShell loading state", () => {
  it("renders the sidebar structure during pending reloads without auth CTAs", () => {
    const { container } = renderShell({ pending: true })

    expect(
      container.querySelector('[data-sidebar="sidebar"]'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0)
    expect(screen.getByText("Workspace")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/dashboard",
    )

    expect(screen.queryByText("Welcome to UpClass")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument()
    expect(
      container.querySelector("[data-slot='home-shell-header-skeleton']"),
    ).toBeInTheDocument()
  })

  it("shows authentication CTAs only in the confirmed unauthenticated state", () => {
    renderShell({ isAuthenticated: false })

    expect(screen.getByText("Welcome to UpClass")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    )
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/sign-up",
    )
  })

  it("hides the sidebar for confirmed unauthenticated visitors", () => {
    const { container } = renderShell({ isAuthenticated: false })

    expect(
      container.querySelector('[data-sidebar="sidebar"]'),
    ).not.toBeInTheDocument()
  })
})
