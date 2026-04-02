import Link from "next/link"

import { Button } from "@/components/ui/button"

export function AuthRequiredCard({
  title = "Sign in required",
  description = "Sign in to view this page.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex justify-center">
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    </div>
  )
}
