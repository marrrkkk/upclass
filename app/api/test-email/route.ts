import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { sendTestEmail } from "@/lib/notifications/delivery"

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string }
  const recipient = body.to?.trim() || session.user.email

  const result = await sendTestEmail(recipient)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    to: recipient,
  })
}
