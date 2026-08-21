import { redirect } from "next/navigation"

export default async function LearnCollectionPage({ params }: { params: Promise<{ orgSlug: string; collectionId: string }> }) {
  const { orgSlug, collectionId } = await params
  redirect(`/${orgSlug}/learn/spaces/${collectionId}`)
}
