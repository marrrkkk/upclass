"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
        <Card className="border shadow-sm">
          <CardHeader className="items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <WifiOff className="h-6 w-6" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="max-w-md">{description}</CardDescription>
          </CardHeader>
          {backHref ? (
            <CardContent className="flex justify-center pt-0">
              <Button asChild variant="outline">
                <Link href={backHref}>{backLabel}</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
