"use client"

import { useState, useMemo } from "react"
import {
  FileText,
  FileSpreadsheet,
  FileIcon,
  Upload,
  Library,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"

type OrgResource = {
  id: string
  organizationId: string
  title: string
  description: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  uploadedBy: string
  sourceClassId: string | null
  sourceResourceId: string | null
  createdAt: Date
  updatedAt: Date
}

type OrgRole = "admin" | "teacher" | "student"

interface OrgResourceLibraryProps {
  orgId: string
  resources: OrgResource[]
  userRole: OrgRole
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText className="size-5 text-red-500" />
    case "doc":
    case "docx":
      return <FileText className="size-5 text-blue-500" />
    case "ppt":
    case "pptx":
      return <FileText className="size-5 text-orange-500" />
    case "xls":
    case "xlsx":
      return <FileSpreadsheet className="size-5 text-green-500" />
    case "txt":
      return <FileText className="size-5 text-muted-foreground" />
    default:
      return <FileIcon className="size-5 text-muted-foreground" />
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function OrgResourceLibrary({
  orgId,
  resources,
  userRole,
}: OrgResourceLibraryProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const resource of resources) {
      cats.add(resource.category || "General")
    }
    return Array.from(cats).sort()
  }, [resources])

  const filteredResources = useMemo(() => {
    if (categoryFilter === "all") return resources
    return resources.filter(
      (r) => (r.category || "General") === categoryFilter
    )
  }, [resources, categoryFilter])

  const canUpload = userRole === "admin" || userRole === "teacher"

  return (
    <div className="flex flex-col gap-6">
      {/* Header with filter and upload */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canUpload && (
          <Button size="sm">
            <Upload className="size-4" />
            Upload Resource
          </Button>
        )}
      </div>

      {/* Resource grid or empty state */}
      {filteredResources.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Library />
            </EmptyMedia>
            <EmptyTitle>No resources yet</EmptyTitle>
            <EmptyDescription>
              {canUpload
                ? "Upload resources to share with your organization."
                : "No resources have been shared with this organization yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <Card key={resource.id} size="sm" className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {getFileIcon(resource.fileType)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium">
                    {resource.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(resource.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {resource.category || "General"}
                </Badge>
                <span className="text-xs uppercase text-muted-foreground">
                  {resource.fileType}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
