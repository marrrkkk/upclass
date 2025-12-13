import { headers } from "next/headers"
import { OnboardRedirect } from "@/components/onboard-redirect"
import { HomeShell } from "@/components/layouts/home-shell"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id
  let userInfo = null
  let hasRole = false
  let userId: string | undefined = undefined

  if (isAuthenticated) {
    // Check if user has completed onboarding (has a role)
    const userData = await db
      .select({
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    userInfo = {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    }

    hasRole = userData.length > 0 && userData[0].role !== null
    userId = session.user.id
  }

  return (
    <>
      {isAuthenticated && <OnboardRedirect hasRole={hasRole} />}
      <HomeShell
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
        userId={userId}
      >
        {children}
      </HomeShell>
    </>
  )
}
