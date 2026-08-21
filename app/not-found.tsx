"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"
import { organizationPath } from "@/lib/organization-path"

export default function NotFound() {
  const params = useParams<{ orgSlug?: string | string[] }>()
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : null
  const homePath = orgSlug ? organizationPath(orgSlug, "/dashboard") : "/"
  const classesPath = orgSlug ? organizationPath(orgSlug, "/classes") : null

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <Panel padding="none" className="w-full">
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          tone="primary"
          size="page"
          title="Page not found"
          description="The page may have moved, or the link may no longer be available."
          action={(
            <>
              <Button asChild>
                <Link href={homePath}>
                  <ArrowLeft aria-hidden="true" />
                  {orgSlug ? "Back to dashboard" : "Back to UpClass"}
                </Link>
              </Button>
              {classesPath ? (
                <Button asChild variant="outline">
                  <Link href={classesPath}>Browse classes</Link>
                </Button>
              ) : null}
            </>
          )}
        />
      </Panel>
    </div>
  )
}
