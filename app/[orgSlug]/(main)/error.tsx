"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"
import { PageContainer } from "@/components/ui/section"
import { organizationPath } from "@/lib/organization-path"

export default function MainRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ orgSlug?: string | string[] }>()
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : null
  const homeHref = organizationPath(orgSlug, "/dashboard")

  useEffect(() => {
    console.error("Main route error", error)
  }, [error])

  return (
    <PageContainer width="narrow" className="flex min-h-[60dvh] items-center">
      <Panel padding="none" className="w-full">
        <EmptyState
          icon={<AlertTriangle aria-hidden="true" />}
          tone="danger"
          size="page"
          title="This page could not be loaded"
          description="Try loading it again. If the problem continues, return to your workspace dashboard."
          role="alert"
          action={(
            <>
              <Button type="button" onClick={reset}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href={homeHref}>
                  <Home aria-hidden="true" />
                  Go to dashboard
                </Link>
              </Button>
            </>
          )}
        />
      </Panel>
    </PageContainer>
  )
}
