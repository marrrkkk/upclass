import type { Metadata } from "next"

import { MessagesRouteClient } from "@/components/messages/messages-route-client"

export const metadata: Metadata = {
  title: "Messages",
}

export default function MessagesPage() {
  return <MessagesRouteClient />
}
