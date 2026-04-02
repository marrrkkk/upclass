import type { ResourceAiStatus } from "@/lib/resources/types"

export function getResourceAiStatusMeta(status: ResourceAiStatus) {
  switch (status) {
    case "ready":
      return {
        label: "AI Ready",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      }
    case "failed":
      return {
        label: "AI Failed",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      }
    case "unsupported":
      return {
        label: "AI Unsupported",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      }
    default:
      return {
        label: "AI Processing",
        className: "bg-sky-50 text-sky-700 border-sky-200",
      }
  }
}

export function formatResourceCitation(citation: {
  fileName: string
  pageNumber: number | null
  chunkIndex: number
  sectionLabel: string | null
}) {
  if (citation.pageNumber) {
    return `${citation.fileName}, page ${citation.pageNumber}`
  }

  if (citation.sectionLabel) {
    return `${citation.fileName}, ${citation.sectionLabel}`
  }

  return `${citation.fileName}, chunk ${citation.chunkIndex + 1}`
}
