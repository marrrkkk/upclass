import { NextResponse } from "next/server"

import { getRequiredUserId, unauthorizedResponse } from "@/app/api/main/route-utils"
import { getHomeOverviewData } from "@/lib/server/main-route-data"

export async function GET() {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const data = await getHomeOverviewData(userId)
  return NextResponse.json(data)
}
