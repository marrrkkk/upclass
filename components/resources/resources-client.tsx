"use client"

import { memo, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Download,
  FileIcon as FileIconLucide,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  Search,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ResourceCardSkeleton } from "@/components/skeletons"
import { BackgroundCache } from "@/lib/background-cache"
import { BackgroundSync } from "@/lib/background-sync"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import type { ManagedClassOption, ResourceCardData } from "@/lib/main-app-queries"
import { getResourceAiStatusMeta } from "@/lib/resources/status"
import { cn } from "@/lib/utils"
import { usePrefetch } from "@/hooks/use-prefetch"
import { useResourcesStore } from "@/stores/resources-store"

type ResourcesClientProps = {
  resources: ResourceCardData[]
  managedClasses?: ManagedClassOption[]
  isAuthenticated?: boolean
  isLoading?: boolean
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
  if (t === "pdf") return { icon: FileText, bgColor: "bg-red-50", textColor: "text-red-600" }
  if (t === "doc" || t === "docx") {
    return { icon: FileText, bgColor: "bg-blue-50", textColor: "text-blue-600" }
  }
  if (t === "xls" || t === "xlsx" || t === "csv") {
    return { icon: FileSpreadsheet, bgColor: "bg-green-50", textColor: "text-green-600" }
  }
  if (t === "ppt" || t === "pptx") {
    return { icon: Presentation, bgColor: "bg-orange-50", textColor: "text-orange-600" }
  }
  if (t === "txt") return { icon: FileType, bgColor: "bg-gray-50", textColor: "text-gray-600" }
  return { icon: FileIconLucide, bgColor: "bg-gray-50", textColor: "text-gray-600" }
}

const formatFileSize = (size: string | null) => {
  if (!size) return ""
  const bytes = Number.parseInt(size, 10)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResourcesClient({
  resources,
  isAuthenticated = false,
  isLoading = false,
}: ResourcesClientProps) {
  const { setResources, setIsAuthenticated, resources: storeResources } = useResourcesStore()
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [selectedClassId, setSelectedClassId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const hasServerResources = resources.length > 0
    const isOffline = typeof window !== "undefined" && !navigator.onLine

    if (isOffline && !hasServerResources) {
      return
    }

    setResources(resources)
    setIsAuthenticated(isAuthenticated)
  }, [resources, isAuthenticated, setResources, setIsAuthenticated])

  useCacheData(storeResources, "resources", true)

  useOfflineCollectionCache<ResourceCardData>({
    onlineData: resources,
    getCachedData: () => BackgroundCache.getInstance().getCachedResources(),
    onHydrate: setResources,
  })

  useEffect(() => {
    if (typeof window === "undefined" || navigator.onLine) return

    let cancelled = false

    const hydrateOfflineResources = async () => {
      const cachedResources = await BackgroundCache.getInstance().getCachedResources()
      if (cancelled || cachedResources.length === 0) return

      setResources(cachedResources)
      setIsAuthenticated(true)
    }

    void hydrateOfflineResources()

    return () => {
      cancelled = true
    }
  }, [setIsAuthenticated, setResources])

  useEffect(() => {
    if (storeResources.length > 0 && navigator.onLine) {
      const imageUrls = storeResources
        .map((resource) => resource.authorImage)
        .filter((url): url is string => !!url)

      if (imageUrls.length > 0) {
        BackgroundSync.getInstance().cacheImages(imageUrls)
      }
    }
  }, [storeResources])

  const classOptions = useMemo(() => {
    const uniqueClasses = new Map<string, { id: string; title: string }>()

    for (const resource of storeResources) {
      if (!uniqueClasses.has(resource.classId)) {
        uniqueClasses.set(resource.classId, {
          id: resource.classId,
          title: resource.className,
        })
      }
    }

    return Array.from(uniqueClasses.values()).sort((left, right) =>
      left.title.localeCompare(right.title),
    )
  }, [storeResources])

  const filteredResources = useMemo(() => {
    let filtered = storeResources

    if (selectedClassId !== "all") {
      filtered = filtered.filter((resource) => resource.classId === selectedClassId)
    }

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((resource) =>
        [
          resource.title,
          resource.description,
          resource.category,
          resource.fileName,
          resource.className,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    }

    return filtered
  }, [searchQuery, selectedClassId, selectedFilter, storeResources])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search class resources..."
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {fileTypeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedFilter === filter.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:bg-accent",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map((classOption) => (
                <SelectItem key={classOption.id} value={classOption.id}>
                  {classOption.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ResourceCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-sky-50 text-sky-700">
              <FileText className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No resources found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || selectedFilter !== "all" || selectedClassId !== "all"
                ? "No resources match your current filters."
                : "No class resources are available yet."}
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
  const statusMeta = getResourceAiStatusMeta(data.aiStatus)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 h-full">
      <Link
        href={resourceHref}
        prefetch
        onMouseEnter={() => prefetchOnHover(resourceHref)}
        onMouseLeave={() => cancelPrefetch(resourceHref)}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">View {data.title}</span>
      </Link>

      <div
        className={cn(
          "relative h-32 flex items-center justify-center overflow-hidden transition-colors duration-300",
          fileInfo.bgColor,
        )}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px] [color:inherit]" />

        <div className={cn("relative z-10 transform transition-transform duration-300 group-hover:scale-110", fileInfo.textColor)}>
          <div className="p-4 rounded-xl bg-white/40 backdrop-blur-sm shadow-sm border border-white/30">
            <fileInfo.icon className="h-10 w-10" />
          </div>
        </div>

        <div className="absolute top-3 right-3 z-20">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium bg-white/90 backdrop-blur-sm",
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {data.className}
          </p>
          <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
            {data.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-[2.5em]">
            {data.description || "No description provided."}
          </p>
        </div>

        <div className="mt-auto pt-4 border-t flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{createdDate}</span>
              {data.fileSize ? <span>{formatFileSize(data.fileSize)}</span> : null}
            </div>
            <span>{data.aiChunkCount} chunks</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border/50 min-w-0">
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

            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 p-2 -mr-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/10"
              title="Download"
              onClick={(event) => event.stopPropagation()}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
})
