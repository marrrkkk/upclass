import { NextResponse } from "next/server"

import {
  getRequiredUserId,
  handleMainRouteDataError,
  unauthorizedResponse,
} from "@/app/api/main/route-utils"
import { getVisibleClassTab } from "@/lib/classes/class-detail-tabs"
import { getClassDetailTabData } from "@/lib/server/main-route-data"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  const activeTab = getVisibleClassTab(searchParams.get("tab"), "stream")

  try {
    const data = await getClassDetailTabData(id, userId, activeTab)
    return NextResponse.json(data)
  } catch (error) {
    return handleMainRouteDataError(error)
  }
}
