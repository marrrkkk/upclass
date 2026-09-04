export const SEEDED_RESOURCES_PREFIX = "/seeded-resources/"

export const RESOURCE_FILE_ROUTE = "/api/resources"

const RESOURCE_BUCKET = "resources"

const SUPABASE_PUBLIC_OBJECT_BASE = "/storage/v1/object/public"

export type ResourceFileLocation =
  | { kind: "seeded"; fileName: string }
  | { kind: "external"; url: string }
  | { kind: "app-route" }

const RESOURCE_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

export function resourceContentType(fileType: string | null | undefined): string {
  const normalized = fileType?.trim().toLowerCase()
  if (normalized && RESOURCE_CONTENT_TYPES[normalized]) {
    return RESOURCE_CONTENT_TYPES[normalized]
  }
  return "application/octet-stream"
}

export function isSafeResourceFileName(fileName: string | null | undefined): fileName is string {
  if (!fileName) return false
  if (fileName.length === 0 || fileName.length > 255) return false
  if (fileName !== fileName.trim()) return false
  if (fileName.includes("/") || fileName.includes("\\")) return false
  if (fileName.includes("..")) return false
  if (/[\0\r\n]/.test(fileName)) return false
  return true
}

export function isSafeStoragePath(storagePath: string | null | undefined): storagePath is string {
  if (!storagePath) return false
  if (storagePath.length > 1024) return false
  if (storagePath.includes("\\") || storagePath.includes("\0")) return false
  const segments = storagePath.split("/")
  if (segments.length < 2) return false
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  )
}

export function classifyResourceFileUrl(
  fileUrl: string | null | undefined,
): ResourceFileLocation {
  const value = typeof fileUrl === "string" ? fileUrl.trim() : ""
  if (!value) return { kind: "app-route" }

  if (value.startsWith(SEEDED_RESOURCES_PREFIX)) {
    const rawName = value.slice(SEEDED_RESOURCES_PREFIX.length)
    let decoded = rawName
    try {
      decoded = decodeURIComponent(rawName)
    } catch {
      return { kind: "app-route" }
    }
    if (!isSafeResourceFileName(decoded)) return { kind: "app-route" }
    return { kind: "seeded", fileName: decoded }
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { kind: "app-route" }
      }
      return { kind: "external", url: value }
    } catch {
      return { kind: "app-route" }
    }
  }

  return { kind: "app-route" }
}

function seededResourceUrl(fileName: string): string {
  return `${SEEDED_RESOURCES_PREFIX}${encodeURIComponent(fileName)}`
}

export function storagePublicUrl(storagePath: string, bucket = RESOURCE_BUCKET): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "")
  if (!base || !isSafeStoragePath(storagePath)) return null
  return `${base}${SUPABASE_PUBLIC_OBJECT_BASE}/${bucket}/${storagePath}`
}

/**
 * Returns a corrected URL for legacy rows whose stored fileUrl points at an
 * app route instead of /seeded-resources/* or the storage bucket, or null when
 * the row cannot be repaired from its own columns.
 */
export function suggestRepairedResourceUrl({
  fileUrl,
  storagePath,
  fileName,
}: {
  fileUrl: string | null | undefined
  storagePath: string | null | undefined
  fileName: string | null | undefined
}): string | null {
  if (classifyResourceFileUrl(fileUrl).kind !== "app-route") return null

  const repairedStorageUrl = storagePath ? storagePublicUrl(storagePath) : null
  if (repairedStorageUrl) return repairedStorageUrl

  if (isSafeResourceFileName(fileName)) return seededResourceUrl(fileName)

  return null
}

/**
 * The single source of truth for what a browser should load to show or
 * download a resource file. Validated seeded paths and external storage URLs
 * are used directly; anything else (legacy rows pointing at app routes,
 * malformed values) is served through the access-checked file endpoint.
 * 
 * For external URLs that may be broken, we route through the API endpoint
 * which has fallback logic to repair URLs using storagePath.
 */
export function resolveResourceFileSrc(resource: { id: string; fileUrl: string }): string {
  const location = classifyResourceFileUrl(resource.fileUrl)
  switch (location.kind) {
    case "seeded":
      return seededResourceUrl(location.fileName)
    case "external":
      // External Supabase Storage URLs may be outdated or broken.
      // Use the API route which has repair logic via storagePath.
      if (resource.fileUrl.includes("/storage/v1/object/public/")) {
        return `${RESOURCE_FILE_ROUTE}/${encodeURIComponent(resource.id)}/file`
      }
      return location.url
    case "app-route":
      return `${RESOURCE_FILE_ROUTE}/${encodeURIComponent(resource.id)}/file`
  }
}

export function inlineContentDisposition(fileName: string): string {
  const sanitized = fileName
    .replace(/["\\]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
  const fallback = sanitized || "file"
  return `inline; filename="${fallback}"`
}
