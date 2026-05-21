"use client"

import { useState, useTransition } from "react"
import { BookOpen, Loader2 } from "lucide-react"

import { selfEnroll } from "@/app/actions/enrollments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

interface AvailableClass {
  id: string
  title: string
  description: string | null
  category: string | null
}

interface ClassBrowserProps {
  orgId: string
  classes: AvailableClass[]
}

export function ClassBrowser({ orgId, classes }: ClassBrowserProps) {
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const availableClasses = classes.filter((c) => !enrolledIds.has(c.id))

  function handleEnroll(classId: string) {
    setEnrollingId(classId)
    setFeedback(null)

    startTransition(async () => {
      const result = await selfEnroll(orgId, classId)

      if (result.success) {
        setEnrolledIds((prev) => new Set([...prev, classId]))
        setFeedback({ type: "success", message: "Successfully enrolled!" })
      } else {
        setFeedback({ type: "error", message: result.error })
      }

      setEnrollingId(null)
    })
  }

  if (availableClasses.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <BookOpen className="size-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>All caught up</EmptyTitle>
          <EmptyDescription>
            You are enrolled in all available classes for this organization.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <p
          className={
            feedback.type === "success"
              ? "text-sm text-green-600"
              : "text-sm text-destructive"
          }
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableClasses.map((cls) => {
          const isEnrolling = enrollingId === cls.id && pending

          return (
            <Card key={cls.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{cls.title}</CardTitle>
                  {cls.category && (
                    <Badge variant="secondary" className="shrink-0">
                      {cls.category}
                    </Badge>
                  )}
                </div>
                {cls.description && (
                  <CardDescription className="line-clamp-2">
                    {cls.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleEnroll(cls.id)}
                  disabled={isEnrolling || pending}
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enrolling…
                    </>
                  ) : (
                    "Enroll"
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
