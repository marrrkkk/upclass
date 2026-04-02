import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getAuthorizedResourceForUser } from "@/lib/resources/auth"
import { createSignedStorageDownloadUrl } from "@/lib/storage/server"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const resource = await getAuthorizedResourceForUser(id, session.user.id)

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 })
  }

  if (!resource.storageBucket || !resource.storagePath) {
    return NextResponse.json({ error: "Resource storage is not available" }, { status: 404 })
  }

  try {
    const signedUrl = await createSignedStorageDownloadUrl(
      resource.storageBucket,
      resource.storagePath,
      60,
    )

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to access this resource file"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
