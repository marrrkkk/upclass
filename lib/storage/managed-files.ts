export type ManagedStorageFile = {
  url: string
  bucket?: string | null
  path?: string | null
}

export type ManagedAttachment = {
  fileUrl: string
  fileName: string
  fileType?: string | null
  fileSize?: string | null
  storageBucket?: string | null
  storagePath?: string | null
}

function readTrimmed(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

export function readManagedStorageFields(formData: FormData, fieldName: string) {
  const url = readTrimmed(formData.get(fieldName))
  const bucket = readTrimmed(formData.get(`${fieldName}StorageBucket`))
  const path = readTrimmed(formData.get(`${fieldName}StoragePath`))

  return {
    url: url || null,
    bucket: bucket || null,
    path: path || null,
  }
}

export function toManagedStorageRef(file: {
  bucket?: string | null
  path?: string | null
}) {
  return {
    bucket: file.bucket ?? null,
    path: file.path ?? null,
  }
}

export function didManagedStorageChange(
  previous: { bucket?: string | null; path?: string | null },
  next: { bucket?: string | null; path?: string | null },
) {
  return (previous.bucket || null) !== (next.bucket || null) || (previous.path || null) !== (next.path || null)
}
