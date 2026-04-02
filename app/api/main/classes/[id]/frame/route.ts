import { NextResponse } from "next/server"

import {
  getRequiredUserId,
  handleMainRouteDataError,
  unauthorizedResponse,
} from "@/app/api/main/route-utils"
import { getClassDetailFrameData } from "@/lib/server/main-route-data"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getRequiredUserId()

  if (!userId) {
    return unauthorizedResponse()
  }

  const { id } = await context.params

  try {
    const data = await getClassDetailFrameData(id, userId)
    return NextResponse.json(data)
  } catch (error) {
    return handleMainRouteDataError(error)
  }
}
