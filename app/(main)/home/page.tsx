import type { Metadata } from "next"

import { HomePageClient } from "@/components/home/home-page-client"

export const metadata: Metadata = {
  title: "Home",
}

export default function HomePage() {
  return <HomePageClient />
}
