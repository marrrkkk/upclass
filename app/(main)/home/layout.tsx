import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { OnboardRedirect } from "@/components/onboard-redirect"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Button } from "@/components/ui/button"

export default async function HomeLayout({
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
      image: session.user.image,
    }

    hasRole = userData.length > 0 && userData[0].role !== null
    userId = session.user.id
  }

  return (
    <>
      {isAuthenticated && <OnboardRedirect hasRole={hasRole} />}
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar userId={userId} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border px-8 flex items-center h-16 min-h-16 max-h-16">
            {isAuthenticated && userInfo ? (
              <PageHeader user={userInfo} userId={userId} />
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Welcome to UpClass</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/sign-in">Get Started</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

