"use client"

import { useState, useMemo } from "react"
import {
  FileText,
  Search,
  Download,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileIcon as FileIconLucide,
  FileType
} from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  authorName: string | null
  authorImage: string | null
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

const getFileTypeInfo = (type: string) => {
  const t = type.toLowerCase()
  if (t === 'pdf') return { icon: FileText, bgColor: 'bg-red-50', textColor: 'text-red-600' }
  if (t === 'doc' || t === 'docx') return { icon: FileText, bgColor: 'bg-blue-50', textColor: 'text-blue-600' }
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return { icon: FileSpreadsheet, bgColor: 'bg-green-50', textColor: 'text-green-600' }
  if (t === 'ppt' || t === 'pptx') return { icon: Presentation, bgColor: 'bg-orange-50', textColor: 'text-orange-600' }
  if (t === 'txt') return { icon: FileType, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
  return { icon: FileIconLucide, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
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
    <div className="flex flex-col gap-8">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 items-start justify-start w-full">
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border-0 py-2.5 pl-10 text-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary/20 bg-muted/20 transition-all hover:bg-muted/30 focus:bg-white"
          />
        </div>

        {/* File Type Filters */}
        <div className="flex overflow-x-auto pb-2 md:pb-0 no-scrollbar gap-2 w-full">
          {fileTypeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                selectedFilter === filter.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {searchQuery || selectedFilter !== "all"
              ? "No resources found"
              : "No uploaded resources"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery || selectedFilter !== "all"
              ? "We couldn't find matches for your search. Try adjusting the keywords or filters."
              : "Upload documents, slides, and other materials to share with your class."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      year: "numeric"
    }).format(new Date(data.createdAt))
    : ""

  const fileInfo = getFileTypeInfo(data.fileType)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 h-full">
      <Link href={`/home/resources/${data.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {data.title}</span>
      </Link>

      {/* Card Header / Preview Area */}
      <div
        className={cn("relative h-32 flex items-center justify-center overflow-hidden", fileInfo.bgColor)}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px] [color:inherit]" />

        <div className={cn("relative z-10 transform transition-transform duration-300 group-hover:scale-110", fileInfo.textColor)}>
          <div className="p-4 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm border border-white/20">
            <fileInfo.icon className="h-10 w-10" />
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-md bg-white/90 px-2 py-1 text-xs font-semibold uppercase tracking-wider shadow-sm text-foreground/80 backdrop-blur-sm">
            {data.fileType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
            {data.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-[2.5em]">
            {data.description || "No description provided."}
          </p>
        </div>

        <div className="mt-auto pt-4 border-t flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{createdDate}</span>
              {data.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(data.fileSize)}</span>
                </>
              )}
            </div>

            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 p-2 -mr-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/10"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>

          {/* Author Info */}
          <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border/50">
            <Avatar className="h-6 w-6">
              <AvatarImage src={data.authorImage || undefined} alt={data.authorName || "Author"} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {data.authorName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              By <span className="font-medium text-foreground/80">{data.authorName || "Unknown"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}



