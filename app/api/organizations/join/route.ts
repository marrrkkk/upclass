import { NextResponse } from "next/server"
import { joinOrganizationByInvite } from "@/app/actions/organization"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { inviteCode } = body

    const result = await joinOrganizationByInvite({ token: inviteCode })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Join organization API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
