import { Suspense } from "react"

import { notFound } from "next/navigation"
import { getStudyCollection } from "@/app/actions/learn"
import { LearnCollectionClient } from "@/components/learn/learn-collection-client"
import { StudyReviewSkeleton } from "@/components/skeletons"

export default function StudyReviewPage({ params }: { params: Promise<{ orgSlug: string; spaceId: string }> }) {
  return (
    <Suspense fallback={<StudyReviewSkeleton />}>
      <StudyReviewData params={params} />
    </Suspense>
  )
}

async function StudyReviewData({ params }: { params: Promise<{ orgSlug: string; spaceId: string }> }) {
  const { orgSlug, spaceId } = await params
  const data = await getStudyCollection(orgSlug, spaceId)
  if (!data) notFound()
  return <LearnCollectionClient orgSlug={orgSlug} collection={data.collection} cards={data.cards} />
}
