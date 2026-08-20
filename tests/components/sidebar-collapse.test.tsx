import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarCollapseToggle } from "@/components/layouts/sidebar-collapse-toggle";
import { Sidebar } from "@/components/sidebar";
import { SidebarNavLink } from "@/components/sidebar/sidebar-nav-link";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MessageSquare } from "lucide-react";

vi.mock("@/hooks/use-organizations", () => ({
  useOrganizations: () => ({
    currentOrg: null,
    organizations: [],
    setCurrentOrg: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/lib/supabase-client", () => ({
  supabase: null,
}));

describe("sidebar collapse", () => {
  afterEach(() => {
    cleanup();
    document.cookie = "sidebar_state=; path=/; max-age=0";
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders rail nav links with an accessible name instead of visible text", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarNavLink
          href="/dashboard"
          icon={<MessageSquare />}
          label="Messages"
        />
      </SidebarProvider>,
    );

    const link = screen.getByRole("link", { name: "Messages" });
    expect(link).toHaveAttribute("title", "Messages");
    expect(link).toHaveAttribute("data-active", "false");
    expect(link.className).toContain("justify-center");
    expect(screen.queryByText("Messages")).not.toBeInTheDocument();
  });

  it("keeps the active collapsed destination named and visually contained", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarNavLink
          href="/dashboard"
          icon={<MessageSquare />}
          label="Messages"
          active
        />
      </SidebarProvider>,
    );

    const link = screen.getByRole("link", { name: "Messages" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.querySelector("span")).toHaveClass("bg-primary/10", "rounded-md");
  });

  it("keeps the full label row when not collapsed", () => {
    render(
      <SidebarProvider>
        <SidebarNavLink
          href="/dashboard"
          icon={<MessageSquare />}
          label="Messages"
        />
      </SidebarProvider>,
    );

    expect(screen.getByText("Messages")).toBeVisible();
  });

  it("keeps mobile drawer links labeled when desktop state is collapsed", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarNavLink
          href="/dashboard"
          icon={<MessageSquare />}
          label="Messages"
        />
      </SidebarProvider>,
    );

    await waitFor(() => expect(screen.getByText("Messages")).toBeVisible());
  });

  it("toggles the rail state from the header button and persists it", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <SidebarCollapseToggle />
      </SidebarProvider>,
    );

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle.className).toContain("md:inline-flex");

    await user.click(toggle);
    expect(document.cookie).toContain("sidebar_state=false");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("renders the full sidebar as an icon rail when collapsed", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar
          userId="user-1"
          userInfo={{
            name: "Ms. Frizzle",
            email: "frizzle@school.test",
            image: null,
          }}
          organizationRole="admin"
          recentClasses={[{ id: "bio-101", title: "Biology 101", color: null }]}
        />
      </SidebarProvider>,
    );

    // Brand collapses to the logo tile with an accessible name.
    expect(
      screen.getByRole("link", { name: "UpClass — dashboard" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("UpClass")).not.toBeInTheDocument();

    // Section headings are only in aria-labels; nav rows keep their accessible names.
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "title",
      "Dashboard",
    );
    expect(
      screen.getByRole("link", { name: "Administration" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Biology 101" })).toHaveAttribute(
      "title",
      "Biology 101",
    );
    expect(
      screen.getByRole("link", { name: "Ms. Frizzle" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("frizzle@school.test")).not.toBeInTheDocument();
  });

  it("keeps the full labeled sidebar when expanded", () => {
    render(
      <SidebarProvider>
        <Sidebar
          userId="user-1"
          userInfo={{
            name: "Ms. Frizzle",
            email: "frizzle@school.test",
            image: null,
          }}
          recentClasses={[{ id: "bio-101", title: "Biology 101", color: null }]}
        />
      </SidebarProvider>,
    );

    expect(screen.getByText("UpClass")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent classes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Biology 101")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
