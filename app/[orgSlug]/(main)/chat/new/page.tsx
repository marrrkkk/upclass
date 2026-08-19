import type { Metadata } from "next"

import { NewChatView } from "@/components/ai/new-chat-view"

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function NewChatPage() {
  return <NewChatView />
}