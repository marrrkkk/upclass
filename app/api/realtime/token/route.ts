import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

async function signJwt(userId: string, secret: string) {
  const now = Math.floor(Date.now() / 1_000)
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + 15 * 60,
  })}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${Buffer.from(signature).toString("base64url")}`
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return NextResponse.json({ error: "Realtime auth is not configured" }, { status: 503 })

  return NextResponse.json({ token: await signJwt(session.user.id, secret), expiresIn: 900 })
}
