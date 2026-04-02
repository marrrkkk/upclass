import { NextResponse } from "next/server"

import { getResourcesPageData } from "@/lib/server/main-route-data"

export async function GET() {
  const data = await getResourcesPageData()
  return NextResponse.json(data)
}
