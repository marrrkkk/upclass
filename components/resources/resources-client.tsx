"use client"

import { useState, useMemo } from "react"
import { FileText, Search, Download } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type ResourceCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  createdAt: string
}

type ResourcesClientProps = {
  resources: ResourceCardData[]
}

const fileTypeFilters = [
  { label: "All", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "PowerPoint", value: "ppt" },
  { label: "Word", value: "doc" },
  { label: "Excel", value: "xls" },
  { label: "Text", value: "txt" },
  { label: "Other", value: "other" },
]

const getFileIcon = (fileType: string) => {
  if (fileType === "pdf") return "📄"
  if (fileType === "ppt" || fileType === "pptx") return "📊"
  if (fileType === "doc" || fileType === "docx") return "📝"
  if (fileType === "xls" || fileType === "xlsx") return "📈"
  if (fileType === "txt") return "📋"
  return "📎"
}

const formatFileSize = (size: string | null) => {
  if (!size) return ""
  const bytes = parseInt(size)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResourcesClient({ resources }: ResourcesClientProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const filteredResources = useMemo(() => {
    let filtered = resources

    // Filter by file type
    if (selectedFilter !== "all") {
      filtered = filtered.filter((resource) => {
        if (selectedFilter === "ppt") {
          return resource.fileType === "ppt" || resource.fileType === "pptx"
        }
        if (selectedFilter === "doc") {
          return resource.fileType === "doc" || resource.fileType === "docx"
        }
        if (selectedFilter === "xls") {
          return resource.fileType === "xls" || resource.fileType === "xlsx"
        }
        return resource.fileType === selectedFilter
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (resource) =>
          resource.title.toLowerCase().includes(query) ||
          resource.description?.toLowerCase().includes(query) ||
          resource.category?.toLowerCase().includes(query) ||
          resource.fileName.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [resources, selectedFilter, searchQuery])

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* File Type Filters */}
        <div className="flex flex-wrap gap-2">
          {fileTypeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedFilter === filter.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-input bg-card text-foreground hover:bg-accent",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-blue-50 text-blue-600">
              <FileText className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No Resources Found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || selectedFilter !== "all"
                ? "No resources match your search criteria. Try adjusting your filters."
                : "You haven't uploaded any resources yet. Get started by uploading your first resource."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} data={resource} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResourceCard({ data }: { data: ResourceCardData }) {
  const createdDate = data.createdAt
    ? new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(data.createdAt))
    : ""

  return (
    <div className="block overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/home/resources/${data.id}`}>
        <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center">
          <div className="text-5xl">{getFileIcon(data.fileType)}</div>
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            {data.fileType.toUpperCase()}
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <Link href={`/home/resources/${data.id}`}>
            <h3 className="text-lg font-semibold text-foreground line-clamp-1 hover:text-blue-600 transition-colors">
              {data.title}
            </h3>
          </Link>
          {data.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {data.description}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {data.fileName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {data.category ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
              {data.category}
            </span>
          ) : null}
          {data.fileSize && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
              {formatFileSize(data.fileSize)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Uploaded {createdDate}</span>
          <a
            href={data.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  )
}

