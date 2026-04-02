import { NextResponse } from "next/server"

import { getRequiredUserId, unauthorizedResponse } from "@/app/api/main/route-utils"
import { activityFilters, type ActivityCategory } from "@/lib/activity-ui"
import { getActivityPageData } from "@/lib/server/main-route-data"

export async function GET(request: Request) {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const filterParam = searchParams.get("filter")
  const filter = activityFilters.some((item) => item.value === filterParam)
    ? (filterParam as ActivityCategory)
    : "all"
  const cursor = searchParams.get("cursor")

  const data = await getActivityPageData(userId, filter, cursor)
  return NextResponse.json(data)
}
