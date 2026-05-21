import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact UpClass support.",
}

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Contact Support</h1>
        <p className="text-muted-foreground">
          Reach out if you need help with access, content, or account issues.
        </p>
      </div>

      <section className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Email{" "}
          <a className="text-primary underline underline-offset-4" href="mailto:support@upclass.xyz">
            support@upclass.xyz
          </a>{" "}
          and include the affected class, resource, or account when possible.
        </p>
        <p>
          For legal and privacy-related questions, review the{" "}
          <Link href="/terms" className="text-primary underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
