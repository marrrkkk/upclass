import { NextResponse } from "next/server"

import { getRequiredUserId, unauthorizedResponse } from "@/app/api/main/route-utils"
import { getNotificationsPageData } from "@/lib/server/main-route-data"

export async function GET() {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const data = await getNotificationsPageData(userId)
  return NextResponse.json(data)
}
