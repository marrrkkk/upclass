import { redirect } from "next/navigation"

export default async function OrgIndexPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/dashboard`)
}