import { unstable_rethrow } from "next/navigation"
import { NextResponse } from "next/server"
import { listUserOrganizations } from "@/app/actions/organization"

export async function GET() {
  try {
    const result = await listUserOrganizations()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    unstable_rethrow(error)
    console.error("List organizations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
