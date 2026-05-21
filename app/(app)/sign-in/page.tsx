import Link from "next/link"
import type { Metadata } from "next"
import { Logo } from "@/components/logo"
import { SignInForm } from "./sign-in-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to UpClass to manage classes, collaborate in realtime, and keep classroom work moving.",
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-70" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] opacity-70" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <Logo href="/" size="lg" />
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Sign in to your account to continue.
          </p>
        </div>

        <div className="bg-card px-6 py-8 shadow-sm ring-1 ring-border rounded-xl">
          <SignInForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  )
}
