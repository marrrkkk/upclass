import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { OnboardRedirect } from "@/components/onboard-redirect"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

export default async function HomeLayout({
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

  // Check if user has completed onboarding (has a role)
  const userData = await db
    .select({
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  // Note: Redirect to onboarding is handled by a client component wrapper
  // to avoid layout conflicts

  const userInfo = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  }

  const hasRole = userData.length > 0 && userData[0].role !== null

  return (
    <>
      <OnboardRedirect hasRole={hasRole} />
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar userId={session.user.id} />
        <main className="flex flex-1 flex-col gap-6 p-8 overflow-y-auto">
          <PageHeader user={userInfo} userId={session.user.id} />
          {children}
        </main>
      </div>
    </>
  )
}

