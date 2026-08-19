import Link from "next/link"
import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create an UpClass account to organize classes, teach with shared whiteboards, and support students in one workspace.",
  alternates: {
    canonical: "/sign-up",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start with your profile, then create or join the organization where you learn and teach."
      providerLabel="Sign up with Google"
      legalPrefix="By creating an account, you agree to our"
      footer={
        <>
          Already have an account?{" "}
          <Link className="focus-ring rounded-sm font-medium text-foreground hover:text-primary-strong" href="/sign-in">
            Sign in
          </Link>
        </>
      }
    />
  )
}
