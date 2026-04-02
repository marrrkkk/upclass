import { NextResponse } from "next/server"

import { getOptionalSession } from "@/lib/server/auth"
import { getClassesPageData } from "@/lib/server/main-route-data"

export async function GET() {
  const session = await getOptionalSession()
  const data = await getClassesPageData(session?.user?.id)

  return NextResponse.json(data)
}
