import { NextResponse } from "next/server"

import { getOptionalSession } from "@/lib/server/auth"
import { MainRouteDataError } from "@/lib/server/main-route-data"

export async function getRequiredUserId() {
  const session = await getOptionalSession()
  return session?.user?.id ?? null
}

export function unauthorizedResponse(message = "Sign in required") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function handleMainRouteDataError(error: unknown) {
  if (error instanceof MainRouteDataError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  throw error
}
