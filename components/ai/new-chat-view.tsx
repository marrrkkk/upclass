"use client"

/**
 * Creates an empty dashboard conversation and redirects into it.
 */
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { createEmptyChat } from "@/app/actions/ai"
import { Spinner } from "@/components/ui/spinner"

export function NewChatView() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void createEmptyChat({ orgSlug: params.orgSlug, surface: "dashboard", entityId: "dashboard" })
      .then((result) => {
        if (!result.success) {
          setError(result.error)
          return
        }
        if (result.conversationId) {
          router.replace(`/${params.orgSlug}/chat/${result.conversationId}`)
        }
      })
      .catch(() => setError("Could not start a new chat"))
  }, [params.orgSlug, router])

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3">
      {error ? (
        <p className="type-small text-destructive">{error}</p>
      ) : (
        <>
          <Spinner aria-hidden="true" />
          <p className="type-caption text-muted-foreground">Setting up a new chat…</p>
        </>
      )}
    </div>
  )
}