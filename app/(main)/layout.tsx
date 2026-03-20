import { headers } from "next/headers"
import { cache, Suspense } from "react"
import { MainLayoutClient } from "@/components/main-layout-client"
import { HomeShell } from "@/components/layouts/home-shell"
import { RootClientShell } from "@/components/root-client-shell"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  })
})

async function ResolvedMainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
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
    <MainLayoutClient hasRole={hasRole} isAuthenticated={isAuthenticated}>
      <HomeShell
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
        userId={userId}
      >
        {children}
      </HomeShell>
    </MainLayoutClient>
  )
}

function MainLayoutFallback({
  children,
}: {
  children: React.ReactNode
}) {
  return <HomeShell isAuthenticated={false}>{children}</HomeShell>
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootClientShell>
      <Suspense fallback={<MainLayoutFallback>{children}</MainLayoutFallback>}>
        <ResolvedMainLayout>{children}</ResolvedMainLayout>
      </Suspense>
    </RootClientShell>
  )
}
