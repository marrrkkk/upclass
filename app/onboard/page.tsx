import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { OnboardClient } from "@/components/onboard/onboard-client"

async function ResolvedOnboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Get user data for pre-filling
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const initialData = userData.length > 0 ? {
    name: userData[0].name,
    email: userData[0].email,
    image: userData[0].image,
    bio: userData[0].bio,
    role: userData[0].role,
  } : undefined

  return <OnboardClient initialData={initialData} />
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-2xl" />}>
      <ResolvedOnboardPage />
    </Suspense>
  )
}
