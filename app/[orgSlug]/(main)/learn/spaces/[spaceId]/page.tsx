import { Suspense } from "react"

import { notFound } from "next/navigation"
import { getStudyCollection } from "@/app/actions/learn"
import { StudySpaceClient } from "@/components/learn/study-space-client"
import { StudySpaceSkeleton } from "@/components/skeletons"

export default function StudySpacePage({ params }: { params: Promise<{ orgSlug: string; spaceId: string }> }) {
  return (
    <Suspense fallback={<StudySpaceSkeleton />}>
      <StudySpaceData params={params} />
    </Suspense>
  )
}

async function StudySpaceData({ params }: { params: Promise<{ orgSlug: string; spaceId: string }> }) {
  const { orgSlug, spaceId } = await params
  const data = await getStudyCollection(orgSlug, spaceId)
  if (!data) notFound()
  return <StudySpaceClient orgSlug={orgSlug} data={data} />
}
