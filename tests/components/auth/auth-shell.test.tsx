import type { ButtonHTMLAttributes, ReactNode } from "react"
import Link from "next/link"
import { render, screen } from "@testing-library/react"

import { AuthShell } from "@/components/auth/auth-shell"

vi.mock("@/components/auth/social-button", () => ({
  default: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

describe("AuthShell", () => {
  it("presents account entry with the expected legal and support navigation", () => {
    render(
      <AuthShell
        title="Welcome back"
        description="Continue to your workspace."
        providerLabel="Continue with Google"
        legalPrefix="By continuing, you agree to our"
        footer={<Link href="/contact">Contact support</Link>}
      />,
    )

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy")
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "/contact")
  })
})
