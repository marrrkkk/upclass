import type { Metadata } from "next"

import { ResourcesRouteClient } from "@/components/resources/resources-route-client"

export const metadata: Metadata = {
  title: "Resources",
}

export default function ResourcesPage() {
  return <ResourcesRouteClient />
}
