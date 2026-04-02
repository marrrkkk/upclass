import { NextResponse } from "next/server"

import { getRequiredUserId, unauthorizedResponse } from "@/app/api/main/route-utils"
import { getRecentClassesForUser } from "@/lib/server/main-route-data"

export async function GET() {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const recentClasses = await getRecentClassesForUser(userId)
  return NextResponse.json(recentClasses)
}
