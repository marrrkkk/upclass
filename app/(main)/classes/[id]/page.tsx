import type { Metadata } from "next"

import { ClassDetailRouteClient } from "@/components/classes/class-detail-route-client"

export function generateMetadata(): Metadata {
  return {
    title: "Class",
  }
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <ClassDetailRouteClient classId={id} />
}
