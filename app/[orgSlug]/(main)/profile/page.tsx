import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { orgSlug } = await params
  redirect(`/${orgSlug}/user/${session.user.id}`)
}

