"use client"

import { useState, useMemo, useEffect, memo } from "react"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { usePrefetch } from "@/hooks/use-prefetch"
import { useResourcesStore } from "@/stores/resources-store"
import { useCacheData } from "@/lib/cache-hooks"
import { BackgroundSync } from "@/lib/background-sync"

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
  isAuthenticated?: boolean
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

export function ResourcesClient({ resources, isAuthenticated = false }: ResourcesClientProps) {
  const { setResources, setIsAuthenticated, resources: storeResources } = useResourcesStore()
  
  useEffect(() => {
    setResources(resources)
    setIsAuthenticated(isAuthenticated)
  }, [resources, isAuthenticated, setResources, setIsAuthenticated])

  // Cache resources in background
  useCacheData(storeResources, 'resources', true)

  // Cache all resource images in background
  useEffect(() => {
    if (storeResources.length > 0 && navigator.onLine) {
      const imageUrls = storeResources
        .map(resource => resource.authorImage)
        .filter((url): url is string => !!url)
      
      if (imageUrls.length > 0) {
        const sync = BackgroundSync.getInstance()
        sync.cacheImages(imageUrls)
      }
    }
  }, [storeResources])

  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const filteredResources = useMemo(() => {
    let filtered = storeResources

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

    // Filter by search query - optimized
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const queryWords = query.split(/\s+/)
      
      filtered = filtered.filter((resource) => {
        const searchableText = [
          resource.title,
          resource.description,
          resource.category,
          resource.fileName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return queryWords.every(word => searchableText.includes(word))
      })
    }

    return filtered
  }, [storeResources, selectedFilter, searchQuery])

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all"
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} data={resource} />
          ))}
        </div>
      )}
    </div>
  )
}

const ResourceCard = memo(function ResourceCard({ data }: { data: ResourceCardData }) {
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()
  const resourceHref = `/resources/${data.id}`
  const createdDate = useMemo(() => {
    return data.createdAt
      ? new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
        }).format(new Date(data.createdAt))
      : ""
  }, [data.createdAt])

  const fileInfo = useMemo(() => getFileTypeInfo(data.fileType), [data.fileType])

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 h-full">
      <Link 
        href={resourceHref} 
        prefetch={true}
        onMouseEnter={() => prefetchOnHover(resourceHref)}
        onMouseLeave={() => cancelPrefetch(resourceHref)}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">View {data.title}</span>
      </Link>

      {/* Card Header / Preview Area */}
      <div
        className={cn("relative h-32 flex items-center justify-center overflow-hidden transition-colors duration-300", fileInfo.bgColor)}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px] [color:inherit]" />

        <div className={cn("relative z-10 transform transition-transform duration-300 group-hover:scale-110", fileInfo.textColor)}>
          <div className="p-4 rounded-xl bg-white/40 backdrop-blur-sm shadow-sm border border-white/30">
            <fileInfo.icon className="h-10 w-10" />
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-md bg-white/80 px-2 py-1 text-xs font-semibold uppercase tracking-wider shadow-sm text-foreground/80 backdrop-blur-sm">
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
})
