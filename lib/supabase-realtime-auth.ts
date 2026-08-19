"use client"

import { supabase } from "@/lib/supabase-client"

let tokenPromise: Promise<string | null> | null = null
let expiresAt = 0

export async function authorizeSupabaseRealtime() {
  if (!supabase) return false
  const client = supabase
  if (Date.now() < expiresAt && tokenPromise) return Boolean(await tokenPromise)

  tokenPromise = fetch("/api/realtime/token", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null
      const payload = (await response.json()) as { token?: string; expiresIn?: number }
      if (!payload.token) return null
      expiresAt = Date.now() + Math.max(60, (payload.expiresIn || 900) - 60) * 1_000
      client.realtime.setAuth(payload.token)
      return payload.token
    })
    .catch(() => null)

  return Boolean(await tokenPromise)
}
