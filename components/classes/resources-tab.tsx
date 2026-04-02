"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Search } from "lucide-react"

import { CreateResourceButton } from "@/components/resources/create-resource-button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { getResourceAiStatusMeta } from "@/lib/resources/status"
import { cn } from "@/lib/utils"
import type { ClassResourceData } from "@/types/classes"

type ResourcesTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  resources: ClassResourceData[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function ResourcesTab({ classId, userRole, resources }: ResourcesTabProps) {
  const [query, setQuery] = useState("")

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return resources
    }

    return resources.filter((resource) =>
      [resource.title, resource.description, resource.fileName, resource.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query, resources])

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 px-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search class resources..."
            className="pl-9"
          />
        </div>
        {userRole === "teacher" ? <CreateResourceButton classId={classId} /> : null}
      </div>

      {filteredResources.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-sky-50 text-sky-700">
              <FileText className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No resources yet</EmptyTitle>
            <EmptyDescription>
              {query
                ? "No resources match that search."
                : userRole === "teacher"
                  ? "Upload class materials to make them available for students and AI-assisted Q&A."
                  : "Your teacher has not uploaded any class materials yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => {
            const statusMeta = getResourceAiStatusMeta(resource.aiStatus)

            return (
              <Link
                key={resource.id}
                href={`/resources/${resource.id}`}
                className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-2 text-lg font-semibold group-hover:text-primary">
                      {resource.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resource.fileName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {resource.description || "No description provided."}
                </p>

                <div className="mt-auto space-y-2 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{resource.category || "General"}</span>
                    <span>{formatDate(resource.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{resource.authorName || "Unknown"}</span>
                    <span>{resource.aiChunkCount} chunks</span>
                  </div>
                  {resource.aiLastError ? (
                    <p className="line-clamp-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                      {resource.aiLastError}
                    </p>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
