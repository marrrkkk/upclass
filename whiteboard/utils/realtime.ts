import type { SerializedRecordsDiff } from "@/whiteboard/types"

export function serializeRecordsDiff(diff: {
  added: Record<string, unknown>
  updated: Record<string, [unknown, unknown]>
  removed: Record<string, unknown>
}): SerializedRecordsDiff {
  return {
    added: diff.added,
    updated: diff.updated,
    removed: diff.removed,
  }
}

export function hasRecordsDiff(diff: SerializedRecordsDiff) {
  return (
    Object.keys(diff.added).length > 0 ||
    Object.keys(diff.updated).length > 0 ||
    Object.keys(diff.removed).length > 0
  )
}
