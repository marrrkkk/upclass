import Link from "next/link";

import { render, screen } from "@testing-library/react";

import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const mocks = vi.hoisted(() => ({
  pathname: "/academy/classes/course-1",
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ prefetch: mocks.prefetch }),
}));

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}));

vi.mock("@/components/org-switcher", () => ({
  OrgSwitcher: () => <button type="button">North Academy</button>,
}));

vi.mock("@/components/sidebar/messages-section", () => ({
  MessagesSection: () => <Link href="/academy/messages">Messages</Link>,
}));

describe("tenant sidebar", () => {
  it("shows only real tenant routes, recent classes, organization tools, and profile data", () => {
    render(
      <SidebarProvider>
        <Sidebar
          userId="user-1"
          userInfo={{
            name: "Ada Lovelace",
            email: "ada@example.com",
            image: null,
          }}
          organizationRole="admin"
          recentClasses={[
            { id: "course-1", title: "Applied Mathematics", color: null },
            { id: "course-2", title: "Computer Science", color: null },
            { id: "course-3", title: "Physics", color: null },
            { id: "course-4", title: "Chemistry", color: null },
            { id: "course-5", title: "Biology", color: null },
            { id: "course-6", title: "History", color: null },
          ]}
        />
      </SidebarProvider>,
    );

    expect(screen.getByRole("link", { name: /UpClass/ })).toHaveAttribute(
      "href",
      "/academy/dashboard",
    );
    const mainNavigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(mainNavigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/academy/dashboard",
    );
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute(
      "href",
      "/academy/classes",
    );
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
      "href",
      "/academy/messages",
    );
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute(
      "href",
      "/academy/resources",
    );
    expect(screen.getByRole("link", { name: "Classes" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute(
      "data-active",
      "false",
    );

    expect(
      screen.queryByRole("link", { name: "Activity" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Notifications" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("navigation", { name: "Recent classes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent classes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all classes" }),
    ).toHaveAttribute("href", "/academy/classes");
    expect(
      screen.getByRole("link", { name: /Applied Mathematics/ }),
    ).toHaveAttribute("aria-current", "page");

    expect(
      screen.getByRole("navigation", { name: "Account and organization" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Administration" }),
    ).toHaveAttribute("href", "/academy/admin");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/academy/settings",
    );
    expect(screen.getByRole("link", { name: /Ada Lovelace/ })).toHaveAttribute(
      "href",
      "/academy/user/user-1",
    );

    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
    expect(screen.queryByText("Get Learning AI")).not.toBeInTheDocument();
  });
});
