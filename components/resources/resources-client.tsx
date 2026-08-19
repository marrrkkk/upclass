"use client"

import { memo, Suspense, use, useEffect, useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Download,
  FileIcon,
  FileSpreadsheet,
  FileText,
  FileType,
  HardDrive,
  Layers,
  Presentation,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react"

import { CreateResourceButton } from "@/components/resources/create-resource-button"
import { ResourcesPageShell } from "@/components/resources/resources-page-shell"
import { ResourcesGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePrefetch } from "@/hooks/use-prefetch"
import { BackgroundCache } from "@/lib/background-cache"
import { BackgroundSync } from "@/lib/background-sync"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import type { Tone } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import type { ClassCardData } from "@/types/classes"

export type ResourceCardData = {
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
  /**
   * Streaming mode: resources resolve from a server-passed promise. The
   * filter toolbar renders immediately; the grid suspends until the promise
   * resolves. When absent, the `resources` array drives the grid.
   */
  resourcesPromise?: Promise<ResourceCardData[]>
  resources?: ResourceCardData[]
  userClassesPromise?: Promise<ClassCardData[]>
  orgSlug: string
  isAuthenticated?: boolean
}

type FileTypeInfo = {
  icon: LucideIcon
  tone: Tone
  bannerClass: string
  badgeClass: string
}

const fileTypeInfoMap: Record<string, FileTypeInfo> = {
  pdf: {
    icon: FileText,
    tone: "danger",
    bannerClass: "from-rose-500/10 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400",
    badgeClass: "bg-rose-100 dark:bg-rose-950/60 text-rose-500 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  },
  doc: {
    icon: FileText,
    tone: "info",
    bannerClass: "from-sky-500/10 via-sky-500/5 to-transparent text-sky-600 dark:text-sky-400",
    badgeClass: "bg-sky-100 dark:bg-sky-950/60 text-sky-500 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
  },
  docx: {
    icon: FileText,
    tone: "info",
    bannerClass: "from-sky-500/10 via-sky-500/5 to-transparent text-sky-600 dark:text-sky-400",
    badgeClass: "bg-sky-100 dark:bg-sky-950/60 text-sky-500 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
  },
  xls: {
    icon: FileSpreadsheet,
    tone: "success",
    bannerClass: "from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  },
  xlsx: {
    icon: FileSpreadsheet,
    tone: "success",
    bannerClass: "from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  },
  csv: {
    icon: FileSpreadsheet,
    tone: "success",
    bannerClass: "from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  },
  ppt: {
    icon: Presentation,
    tone: "warning",
    bannerClass: "from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400",
    badgeClass: "bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  },
  pptx: {
    icon: Presentation,
    tone: "warning",
    bannerClass: "from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400",
    badgeClass: "bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  },
  txt: {
    icon: FileType,
    tone: "neutral",
    bannerClass: "from-slate-500/10 via-slate-500/5 to-transparent text-slate-600 dark:text-slate-400",
    badgeClass: "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  },
}

const defaultFileInfo: FileTypeInfo = {
  icon: FileIcon,
  tone: "neutral",
  bannerClass: "from-primary/10 via-primary/5 to-transparent text-primary",
  badgeClass: "bg-violet-100 dark:bg-violet-950/60 text-violet-500 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
}

const fileTypeFilters = [
  { label: "All", value: "all", icon: Layers },
  { label: "PDF", value: "pdf", icon: FileText },
  { label: "PowerPoint", value: "ppt", icon: Presentation },
  { label: "Word", value: "doc", icon: FileText },
  { label: "Excel", value: "xls", icon: FileSpreadsheet },
  { label: "Text", value: "txt", icon: FileType },
  { label: "Other", value: "other", icon: FileIcon },
]

function getFileTypeInfo(type: string): FileTypeInfo {
  const normalized = type.toLowerCase()
  return fileTypeInfoMap[normalized] || defaultFileInfo
}

function formatFileSize(size: string | null) {
  if (!size) return ""

  const bytes = Number.parseInt(size, 10)
  if (!Number.isFinite(bytes)) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ResourceTypePill({ fileType }: { fileType: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-2xs">
      {fileType.toUpperCase()}
    </span>
  )
}


function isImageFile(type: string, url: string) {
  const norm = type.toLowerCase()
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "image"].includes(norm)) return true
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url)
}

/** Visual content preview: displays actual image when available or realistic document thumbnail */
function ResourceDocumentPreview({
  fileType,
  fileUrl,
  title,
}: {
  fileType: string
  fileUrl: string
  title: string
}) {
  const [imageError, setImageError] = useState(false)
  const isImage = isImageFile(fileType, fileUrl) && !imageError
  const normalized = fileType.toLowerCase()

  if (isImage) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-surface-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={title}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    )
  }

  if (normalized === "pdf") {
    return (
      <div className="relative flex h-24 w-36 flex-col overflow-hidden rounded-t-md rounded-b-sm border border-hairline/80 bg-card p-2 shadow-xs transition-transform duration-200 group-hover:scale-105">
        <div className="flex items-center gap-1.5 border-b border-rose-500/20 pb-1.5">
          <div className="size-2 rounded-full bg-rose-500" />
          <span className="text-[9px] font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">PDF Document</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-4/5 rounded-xs bg-foreground/25" />
          <div className="h-1 w-full rounded-xs bg-foreground/15" />
          <div className="h-1 w-3/4 rounded-xs bg-foreground/15" />
          <div className="h-1 w-2/3 rounded-xs bg-foreground/10" />
        </div>
        <div className="absolute right-0 top-0 size-3 rounded-bl-sm bg-rose-500/15" />
      </div>
    )
  }

  if (normalized === "ppt" || normalized === "pptx") {
    return (
      <div className="relative flex aspect-[16/10] h-24 flex-col overflow-hidden rounded-md border border-hairline/80 bg-card p-2 shadow-xs transition-transform duration-200 group-hover:scale-105">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-1">
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">Presentation</span>
          <Presentation className="size-2.5 text-amber-500" />
        </div>
        <div className="mt-1.5 flex flex-1 gap-2">
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-full rounded-xs bg-foreground/30" />
            <div className="h-1 w-5/6 rounded-xs bg-foreground/15" />
            <div className="h-1 w-4/6 rounded-xs bg-foreground/15" />
          </div>
          <div className="flex size-8 items-center justify-center rounded-xs bg-amber-500/10 border border-amber-500/20">
            <div className="size-3.5 rounded-full border-2 border-amber-500/40 border-t-amber-500" />
          </div>
        </div>
      </div>
    )
  }

  if (normalized === "xls" || normalized === "xlsx" || normalized === "csv") {
    return (
      <div className="relative flex h-24 w-36 flex-col overflow-hidden rounded-md border border-hairline/80 bg-card p-1.5 shadow-xs transition-transform duration-200 group-hover:scale-105">
        <div className="grid grid-cols-3 gap-0.5 rounded-xs bg-emerald-500/15 p-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300">
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>
        <div className="mt-1 space-y-1">
          <div className="grid grid-cols-3 gap-1 px-1">
            <div className="h-1.5 rounded-xs bg-foreground/20" />
            <div className="h-1.5 rounded-xs bg-foreground/15" />
            <div className="h-1.5 rounded-xs bg-foreground/10" />
          </div>
          <div className="grid grid-cols-3 gap-1 px-1">
            <div className="h-1.5 rounded-xs bg-foreground/15" />
            <div className="h-1.5 rounded-xs bg-foreground/20" />
            <div className="h-1.5 rounded-xs bg-foreground/15" />
          </div>
          <div className="grid grid-cols-3 gap-1 px-1">
            <div className="h-1.5 rounded-xs bg-foreground/10" />
            <div className="h-1.5 rounded-xs bg-foreground/15" />
            <div className="h-1.5 rounded-xs bg-foreground/20" />
          </div>
        </div>
      </div>
    )
  }

  if (normalized === "doc" || normalized === "docx") {
    return (
      <div className="relative flex h-24 w-36 flex-col overflow-hidden rounded-t-md rounded-b-sm border border-hairline/80 bg-card p-2 shadow-xs transition-transform duration-200 group-hover:scale-105">
        <div className="flex items-center gap-1 border-b border-sky-500/20 pb-1">
          <FileText className="size-3 text-sky-600 dark:text-sky-400" />
          <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase">Document</span>
        </div>
        <div className="mt-1.5 space-y-1">
          <div className="h-1.5 w-3/4 rounded-xs bg-foreground/30" />
          <div className="h-1 w-full rounded-xs bg-foreground/15" />
          <div className="h-1 w-full rounded-xs bg-foreground/15" />
          <div className="h-1 w-4/5 rounded-xs bg-foreground/15" />
        </div>
      </div>
    )
  }

  // Text / Code / Generic
  return (
    <div className="relative flex h-24 w-36 flex-col overflow-hidden rounded-md border border-hairline/80 bg-card p-2 shadow-xs transition-transform duration-200 group-hover:scale-105 font-mono">
      <div className="flex items-center gap-1 border-b border-hairline/60 pb-1 text-[8.5px] text-muted-foreground">
        <FileType className="size-2.5" />
        <span className="truncate">{title.slice(0, 12)}</span>
      </div>
      <div className="mt-1.5 space-y-1 text-[8px] text-muted-foreground/60 leading-none">
        <p>1 <span className="text-foreground/40">import</span></p>
        <p>2 <span className="text-foreground/60">const data = ...</span></p>
        <p>3 <span className="text-foreground/30">return data</span></p>
      </div>
    </div>
  )
}

export function ResourcesClient({
  resourcesPromise,
  resources = [],
  userClassesPromise,
  orgSlug,
  isAuthenticated = true,
}: ResourcesClientProps) {
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"newest" | "title" | "size">("newest")
  const [isOffline, setIsOffline] = useState(false)
  const [resultCount, setResultCount] = useState<number | undefined>(undefined)

  // Resolve user classes if promise provided
  const userClasses = userClassesPromise ? use(userClassesPromise) : []

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateConnectionState = () => setIsOffline(!navigator.onLine)

    updateConnectionState()
    window.addEventListener("online", updateConnectionState)
    window.addEventListener("offline", updateConnectionState)

    return () => {
      window.removeEventListener("online", updateConnectionState)
      window.removeEventListener("offline", updateConnectionState)
    }
  }, [])

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedFilter !== "all"
  const resultSummary =
    resultCount != null
      ? `${resultCount} ${resultCount === 1 ? "resource" : "resources"}`
      : undefined

  return (
    <ResourcesPageShell
      actions={
        isAuthenticated ? (
          <CreateResourceButton
            orgSlug={orgSlug}
            userClasses={userClasses}
            label="Upload"
            className="h-9 rounded-lg px-3.5 gap-1.5 text-xs font-semibold shadow-2xs"
          />
        ) : null
      }
      filters={
        <>
          {/* Search bar with clear button */}
          <div className="relative w-full sm:max-w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search resources"
              placeholder="Search resources…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 rounded-lg border-hairline/90 bg-surface/70 pl-9 pr-8 text-sm focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary/40 shadow-2xs placeholder:text-muted-foreground/70"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Adjusted file type filter buttons */}
          <div
            className="scroll-x-region flex min-w-0 flex-wrap items-center gap-1.5 py-0.5"
            role="group"
            aria-label="File type"
          >
            {fileTypeFilters.map((filter) => {
              const isSelected = selectedFilter === filter.value
              const Icon = filter.icon

              return (
                <Button
                  key={filter.value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={cn(
                    "h-9 rounded-lg px-3 text-xs font-semibold transition-all",
                    isSelected
                      ? "shadow-2xs"
                      : "border-hairline/70 bg-surface/40 text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <Icon className="mr-1.5 size-3.5" />
                  {filter.label}
                </Button>
              )
            })}
          </div>

          {/* Sort dropdown */}
          <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as "newest" | "title" | "size")}>
              <SelectTrigger
                aria-label="Sort resources"
                className="h-9 w-[8.75rem] rounded-lg border-hairline/70 bg-surface/40 text-xs font-semibold shadow-2xs hover:bg-surface"
              >
                <SlidersHorizontal className="mr-1.5 size-3 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg border-hairline/80 shadow-e2">
                <SelectItem value="newest" className="text-xs font-medium">Newest first</SelectItem>
                <SelectItem value="title" className="text-xs font-medium">Alphabetical (A-Z)</SelectItem>
                <SelectItem value="size" className="text-xs font-medium">File size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
      summary={resultSummary}
    >
      {isOffline ? (
        <Callout tone="warning" className="rounded-xl">
          You&apos;re offline. Showing resources saved on this device.
        </Callout>
      ) : null}

      <Suspense fallback={<ResourcesGridSkeleton />}>
        <ResourcesGridResolved
          resourcesPromise={resourcesPromise}
          resources={resources}
          selectedFilter={selectedFilter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          isOffline={isOffline}
          hasActiveFilters={hasActiveFilters}
          orgSlug={orgSlug}
          onCountChange={setResultCount}
        />
      </Suspense>
    </ResourcesPageShell>
  )
}

function ResourcesGridResolved({
  resourcesPromise,
  resources,
  selectedFilter,
  searchQuery,
  sortBy,
  isOffline,
  hasActiveFilters,
  orgSlug,
  onCountChange,
}: {
  resourcesPromise?: Promise<ResourceCardData[]>
  resources: ResourceCardData[]
  selectedFilter: string
  searchQuery: string
  sortBy: "newest" | "title" | "size"
  isOffline: boolean
  hasActiveFilters: boolean
  orgSlug: string
  onCountChange: (count: number) => void
}) {
  const [cachedResources, setCachedResources] = useState<ResourceCardData[]>([])
  const resolvedResources = resourcesPromise ? use(resourcesPromise) : resources

  useOfflineCollectionCache<ResourceCardData>({
    onlineData: resolvedResources,
    getCachedData: () => BackgroundCache.getInstance().getCachedResources(),
    onHydrate: setCachedResources,
  })

  // Server props are the source of truth; fall back to the IndexedDB cache
  // only when no server data was provided (e.g. offline first load).
  const displayResources =
    resolvedResources.length > 0 ? resolvedResources : cachedResources

  useCacheData(displayResources, "resources", true)

  useEffect(() => {
    if (displayResources.length === 0 || !navigator.onLine) return

    const imageUrls = displayResources
      .map((resource) => resource.authorImage)
      .filter((url): url is string => Boolean(url))

    if (imageUrls.length > 0) {
      BackgroundSync.getInstance().cacheImages(imageUrls)
    }
  }, [displayResources])

  const filteredResources = useMemo(() => {
    let filtered = displayResources

    if (selectedFilter !== "all") {
      filtered = filtered.filter((resource) => {
        if (selectedFilter === "ppt") {
          return resource.fileType === "ppt" || resource.fileType === "pptx"
        }
        if (selectedFilter === "doc") {
          return resource.fileType === "doc" || resource.fileType === "docx"
        }
        if (selectedFilter === "xls") {
          return resource.fileType === "xls" || resource.fileType === "xlsx" || resource.fileType === "csv"
        }
        return resource.fileType === selectedFilter
      })
    }

    if (searchQuery.trim()) {
      const queryWords = searchQuery.toLowerCase().trim().split(/\s+/)

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

        return queryWords.every((word) => searchableText.includes(word))
      })
    }

    // Sort items
    return [...filtered].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === "size") {
        const sizeA = Number.parseInt(a.fileSize || "0", 10) || 0
        const sizeB = Number.parseInt(b.fileSize || "0", 10) || 0
        return sizeB - sizeA
      }
      // Newest first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })
  }, [displayResources, selectedFilter, searchQuery, sortBy])

  useLayoutEffect(() => {
    onCountChange(filteredResources.length)
  }, [filteredResources.length, onCountChange])

  if (filteredResources.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline/80 bg-card p-12 text-center shadow-e1">
        <EmptyState
          icon={<FileText className="size-8" />}
          tone={isOffline ? "warning" : "neutral"}
          title={
            hasActiveFilters
              ? "No matching resources"
              : isOffline
                ? "No saved resources"
                : "No resources yet"
          }
          description={
            hasActiveFilters
              ? "Try adjusting your search query or choosing a different file type filter."
              : isOffline
                ? "Connect to the internet to load resources that are not saved on this device."
                : "No study materials or documents have been uploaded to this organization yet."
          }
        />
      </div>
    )
  }

  return (
    <div
      role="list"
      aria-label="Resources"
      className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
    >
      {filteredResources.map((resource) => (
        <ResourceCard key={resource.id} data={resource} orgSlug={orgSlug} />
      ))}
    </div>
  )
}

const ResourceCard = memo(function ResourceCard({
  data,
  orgSlug,
}: {
  data: ResourceCardData
  orgSlug: string
}) {
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()
  const resourceHref = `/${orgSlug}/resources/${data.id}`
  const fileInfo = getFileTypeInfo(data.fileType)
  const createdDate = data.createdAt
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(data.createdAt))
    : ""
  const formattedSize = formatFileSize(data.fileSize)

  return (
    <div
      role="listitem"
      data-slot="resource-card"
      className="touch-target group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-e2"
    >
      <Link
        href={resourceHref}
        aria-label={`Open ${data.title}`}
        onMouseEnter={() => prefetchOnHover(resourceHref)}
        onMouseLeave={() => cancelPrefetch(resourceHref)}
        className="focus-ring flex flex-1 flex-col"
      >
        {/* Card Header: Content Preview / Thumbnail */}
        <div
          className={cn(
            "relative flex h-32 items-center justify-center overflow-hidden border-b border-hairline/70 bg-gradient-to-br transition-all duration-300",
            fileInfo.bannerClass,
          )}
        >
          {/* Subtle background abstract shapes */}
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rotate-12 rounded-2xl border border-white/20 bg-white/10 dark:border-white/5 dark:bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 size-28 -rotate-12 rounded-3xl border border-white/15 bg-white/10 dark:border-white/5 dark:bg-white/5" />

          {/* Actual Content Preview or Document Thumbnail */}
          <ResourceDocumentPreview
            fileType={data.fileType}
            fileUrl={data.fileUrl}
            title={data.title}
          />

          {/* Top-right Hover Action Indicator */}
          <div className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-lg bg-card border border-hairline/80 text-muted-foreground opacity-80 shadow-xs transition-all duration-200 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
          <div className="space-y-1.5">
            <h2 className="line-clamp-2 text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {data.title}
            </h2>
            {data.description ? (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground/75 font-mono">
                {data.fileName}
              </p>
            )}
          </div>

          {/* Metadata tags: Category + File Type Badge + File Size Badge */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {data.category ? (
              <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                {data.category}
              </span>
            ) : null}

            {/* File type badge placed besides size badge */}
            <ResourceTypePill fileType={data.fileType} />

            {formattedSize ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs">
                <HardDrive className="size-3 opacity-70" />
                {formattedSize}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-hairline/70 bg-surface-subtle/30 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {data.authorName ? (
            <>
              <EntityAvatar
                name={data.authorName}
                image={data.authorImage}
                colorKey={data.authorName}
                size="xs"
                className="size-5 shrink-0 ring-1 ring-hairline/60"
              />
              <span className="truncate font-semibold text-foreground/80 text-[11.5px]">
                {data.authorName}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {createdDate ? (
            <span className="text-[11px] text-muted-foreground/80">
              Added {createdDate}
            </span>
          ) : null}

          <Button asChild variant="ghost" size="icon-xs" className="size-7 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground">
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${data.title}`}
              title="Download resource"
            >
              <Download className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
})
