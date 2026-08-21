import { notFound } from "next/navigation"
import { getStudyCollection } from "@/app/actions/learn"
import { LearnCollectionClient } from "@/components/learn/learn-collection-client"

export default async function StudyReviewPage({ params }: { params: Promise<{ orgSlug: string; spaceId: string }> }) {
  const { orgSlug, spaceId } = await params
  const data = await getStudyCollection(orgSlug, spaceId)
  if (!data) notFound()
  return <LearnCollectionClient orgSlug={orgSlug} collection={data.collection} cards={data.cards} />
}
