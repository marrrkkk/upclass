"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"

type OfflineRouteGuardProps = {
  title: string
  description: string
  backHref?: string
  backLabel?: string
  children: React.ReactNode
}

export function OfflineRouteGuard({
  title,
  description,
  backHref,
  backLabel = "Go back",
  children,
}: OfflineRouteGuardProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const syncStatus = () => {
      setIsOnline(navigator.onLine)
    }

    syncStatus()
    window.addEventListener("online", syncStatus)
    window.addEventListener("offline", syncStatus)

    return () => {
      window.removeEventListener("online", syncStatus)
      window.removeEventListener("offline", syncStatus)
    }
  }, [])

  if (!isOnline) {
    return (
      <div className="mx-auto flex min-h-[50dvh] w-full max-w-3xl items-center py-8">
        <Panel padding="none" className="w-full">
          <EmptyState
            icon={<WifiOff aria-hidden="true" />}
            tone="warning"
            size="page"
            title={title}
            description={description}
            role="status"
            aria-live="polite"
            action={backHref ? (
              <Button asChild variant="outline">
                <Link href={backHref}>{backLabel}</Link>
              </Button>
            ) : undefined}
          />
        </Panel>
      </div>
    )
  }

  return <>{children}</>
}
