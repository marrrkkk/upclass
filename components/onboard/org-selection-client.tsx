"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { OrgJoinForm } from "@/components/onboard/org-join-form"
import { OrgOnboardingAside } from "@/components/onboard/org-onboarding-aside"
import { OrgOnboardingShell } from "@/components/onboard/org-onboarding-shell"
import { OrgWorkspaceList } from "@/components/onboard/org-workspace-list"
import type { OrganizationSummary } from "@/types/organization"

export type OrgOnboardingMode = "select" | "create" | "join"

type OrgSelectionClientProps = {
  initialData?: { name?: string | null; email?: string | null }
  userOrganizations?: OrganizationSummary[]
  initialMode?: OrgOnboardingMode
  /** Invite token from `?token=`, forwarded from an invite link. */
  initialInviteCode?: string
  error?: string
}

/**
 * Workspace directory with optional inline join when an org invite token is prefilled.
 */
export function OrgSelectionClient({
  initialData,
  userOrganizations = [],
  initialMode = "select",
  initialInviteCode = "",
  error: initialError,
}: OrgSelectionClientProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<OrgOnboardingMode>(initialMode)
  const [error, setError] = React.useState<string | null>(initialError ?? null)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (mode === "create") {
      router.replace("/org/create")
    }
  }, [mode, router])

  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      setError(null)
      if (path === "/org/join") setMode("join")
      else setMode("select")
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const goToSelect = React.useCallback(() => {
    setError(null)
    setMode("select")
    window.history.pushState({}, "", "/org")
  }, [])

  const handleJoin = React.useCallback(
    (values: { code: string }) => {
      setError(null)
      startTransition(async () => {
        try {
          const response = await fetch("/api/organizations/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteCode: values.code }),
          })
          const payload = await response.json()

          if (!response.ok || !payload?.success) {
            setError(payload?.error ?? "Failed to join organization")
            return
          }

          router.push(`/${payload.data.orgSlug}/dashboard`)
        } catch {
          setError("Something went wrong. Check your connection and try again.")
        }
      })
    },
    [router],
  )

  return (
    <OrgOnboardingShell width="content">
      {mode === "select" ? (
        <OrgWorkspaceList
          organizations={userOrganizations}
          greetingName={initialData?.name}
          onCreate={() => router.push("/org/create")}
          onJoin={() => router.push("/org/join")}
        />
      ) : null}

      {mode === "join" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-10">
          <OrgOnboardingAside
            className="hidden lg:block"
            eyebrow="Join a workspace"
            title="Pick up where your class left off"
            description="Enter the invite code you were sent to join an existing workspace. Everything for your classes is waiting inside."
            showHighlights={false}
          />
          <div className="w-full">
            <OrgJoinForm
              pending={pending}
              error={error}
              initialCode={initialInviteCode}
              viewerEmail={initialData?.email ?? null}
              onBack={goToSelect}
              onSubmit={handleJoin}
            />
          </div>
        </div>
      ) : null}
    </OrgOnboardingShell>
  )
}
