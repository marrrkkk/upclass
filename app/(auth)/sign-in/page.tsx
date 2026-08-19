import Link from "next/link"
import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to UpClass to manage classes, collaborate in realtime, and keep classroom work moving.",
  alternates: {
    canonical: "/sign-in",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to your classes, conversations, and teaching workspace."
      providerLabel="Continue with Google"
      legalPrefix="By continuing, you agree to our"
      footer={
        <>
          Need help?{" "}
          <Link className="focus-ring rounded-sm font-medium text-foreground hover:text-primary-strong" href="/contact">
            Contact support
          </Link>
        </>
      }
    />
  )
}
