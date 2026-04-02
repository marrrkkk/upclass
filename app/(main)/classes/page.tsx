import type { Metadata } from "next"

import { ClassesRouteClient } from "@/components/classes/classes-route-client"

export const metadata: Metadata = {
  title: "Classes",
}

export default function ClassesPage() {
  return <ClassesRouteClient />
}
