import { NextResponse } from "next/server"
import { createOrganization } from "@/app/actions/organization"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createOrganization(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Create organization API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
