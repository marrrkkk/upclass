import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MobileNavigation } from "@/components/layouts/mobile-navigation";
import { SidebarProvider } from "@/components/ui/sidebar";

describe("MobileNavigation", () => {
  it("renders tenant-aware primary destinations and identifies the active route", () => {
    render(
      <SidebarProvider>
        <MobileNavigation
          isAuthenticated
          pathname="/north-academy/classes/class-1"
        />
      </SidebarProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/north-academy/dashboard",
    );
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
      "href",
      "/north-academy/messages",
    );
  });

  it("opens the application navigation from More", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <MobileNavigation isAuthenticated pathname="/north-academy/home" />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("does not render in the unauthenticated shell", () => {
    render(
      <SidebarProvider>
        <MobileNavigation
          isAuthenticated={false}
          pathname="/north-academy/home"
        />
      </SidebarProvider>,
    );
    expect(
      screen.queryByRole("navigation", { name: "Primary" }),
    ).not.toBeInTheDocument();
  });
});
