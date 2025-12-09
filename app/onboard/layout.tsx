import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

export default async function OnboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Layout without sidebar - standalone onboarding page
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  )
}

