import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { Building2, Plus, UserPlus } from "lucide-react"

import { getOptionalSession } from "@/lib/server/auth"
import { getUserOrganizations } from "@/app/actions/organizations"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Home — UpClass",
}

export default async function HomePage() {
  const session = await getOptionalSession()

  const isAuthenticated = !!session?.user?.id

  if (!isAuthenticated || !session?.user?.id) {
    redirect("/sign-in")
  }

  const user = session.user

  // Fetch user organizations
  const orgResult = await getUserOrganizations()
  const userOrgs = orgResult?.success ? orgResult.data : []

  // User has orgs → redirect to active org or first org
  if (userOrgs.length > 0) {
    const cookieStore = await cookies()
    const orgSlugCookie = cookieStore.get("x-org-slug")?.value

    if (orgSlugCookie) {
      const matchedOrg = userOrgs.find((o) => o.slug === orgSlugCookie)
      if (matchedOrg) {
        redirect(`/${matchedOrg.slug}`)
      }
    }

    redirect(`/${userOrgs[0].slug}`)
  }

  // No orgs → show create/join page (no sidebar, no top nav)
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Minimal header with avatar only */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <Logo href="/" size="md" />
        <Avatar className="size-9 border border-border">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>

          <h1 className="mt-6 font-heading text-[2rem] font-semibold tracking-tight">
            Welcome to UpClass
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create a new organization or join an existing one to get started.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/org/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/org/join">
                <UserPlus className="mr-2 h-4 w-4" />
                Join an Organization
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
