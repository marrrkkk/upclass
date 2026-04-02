const DEFAULT_BUCKETS = {
  profileMedia: "profile-media",
  resourceFiles: "resource-files",
  messageMedia: "message-media",
  submissionAttachments: "submission-attachments",
  whiteboardAssets: "whiteboard-assets",
} as const

export const MESSAGE_MEDIA_MAX_SIZE_BYTES = 50 * 1024 * 1024

export const STORAGE_BUCKETS = {
  profileMedia: process.env.NEXT_PUBLIC_SUPABASE_PROFILE_MEDIA_BUCKET || DEFAULT_BUCKETS.profileMedia,
  resourceFiles: process.env.NEXT_PUBLIC_SUPABASE_RESOURCE_FILES_BUCKET || DEFAULT_BUCKETS.resourceFiles,
  messageMedia: process.env.NEXT_PUBLIC_SUPABASE_MESSAGE_MEDIA_BUCKET || DEFAULT_BUCKETS.messageMedia,
  submissionAttachments:
    process.env.NEXT_PUBLIC_SUPABASE_SUBMISSION_ATTACHMENTS_BUCKET || DEFAULT_BUCKETS.submissionAttachments,
  whiteboardAssets:
    process.env.NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET || DEFAULT_BUCKETS.whiteboardAssets,
} as const

export type UploadPurpose =
  | "profile-avatar"
  | "profile-cover"
  | "resource-file"
  | "message-media"
  | "channel-message-media"
  | "submission-attachment"

export type UploadContext = {
  channelId?: string
  classworkId?: string
}

export type UploadFileMetadata = {
  name: string
  size: number
  type: string
}

export type SignedUploadDescriptor = UploadFileMetadata & {
  bucket: string
  path: string
  token: string
  publicUrl: string
}

type FileTypeRule = {
  kind: "image" | "video" | "audio" | "text" | "exact"
  mime?: string
  extension?: string
  maxSize: number
}

type UploadPurposeConfig = {
  bucket: string
  maxFileCount: number
  pathPrefix: (userId: string, file: UploadFileMetadata, context?: UploadContext) => string
  rules: FileTypeRule[]
}

const IMAGE_RULE: FileTypeRule = { kind: "image", maxSize: 4 * 1024 * 1024 }
const RESOURCE_DOC_RULES: FileTypeRule[] = [
  { kind: "exact", mime: "application/pdf", extension: "pdf", maxSize: 16 * 1024 * 1024 },
  { kind: "text", extension: "txt", maxSize: 4 * 1024 * 1024 },
  {
    kind: "exact",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
    maxSize: 16 * 1024 * 1024,
  },
  {
    kind: "exact",
    mime: "application/vnd.ms-powerpoint",
    extension: "ppt",
    maxSize: 16 * 1024 * 1024,
  },
  {
    kind: "exact",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    maxSize: 16 * 1024 * 1024,
  },
  {
    kind: "exact",
    mime: "application/msword",
    extension: "doc",
    maxSize: 16 * 1024 * 1024,
  },
  {
    kind: "exact",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
    maxSize: 16 * 1024 * 1024,
  },
  {
    kind: "exact",
    mime: "application/vnd.ms-excel",
    extension: "xls",
    maxSize: 16 * 1024 * 1024,
  },
] as const

const SUBMISSION_RULES: FileTypeRule[] = [
  { kind: "image", maxSize: 8 * 1024 * 1024 },
  { kind: "exact", mime: "application/pdf", extension: "pdf", maxSize: 16 * 1024 * 1024 },
  { kind: "text", extension: "txt", maxSize: 4 * 1024 * 1024 },
  {
    kind: "exact",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    maxSize: 16 * 1024 * 1024,
  },
] as const

const CHANNEL_ATTACHMENT_RULES: FileTypeRule[] = [
  ...SUBMISSION_RULES,
  {
    kind: "exact",
    mime: "application/msword",
    extension: "doc",
    maxSize: 16 * 1024 * 1024,
  },
] as const

function getSafeExtension(fileName: string) {
  const lastSegment = fileName.split(".").pop()?.trim().toLowerCase()
  return lastSegment && /^[a-z0-9]+$/.test(lastSegment) ? lastSegment : "bin"
}

function sanitizeSegment(value: string) {
  const compact = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return compact || "file"
}

function buildFileName(fileName: string) {
  const extension = getSafeExtension(fileName)
  const baseName = fileName.replace(/\.[^.]+$/, "")
  return `${sanitizeSegment(baseName)}-${crypto.randomUUID()}.${extension}`
}

export function buildWhiteboardAssetPath(boardId: string, fileName: string) {
  return `boards/${sanitizeSegment(boardId)}/${buildFileName(fileName)}`
}

const PURPOSE_CONFIG: Record<UploadPurpose, UploadPurposeConfig> = {
  "profile-avatar": {
    bucket: STORAGE_BUCKETS.profileMedia,
    maxFileCount: 1,
    pathPrefix: (userId, file) => `users/${userId}/avatars/${buildFileName(file.name)}`,
    rules: [IMAGE_RULE],
  },
  "profile-cover": {
    bucket: STORAGE_BUCKETS.profileMedia,
    maxFileCount: 1,
    pathPrefix: (userId, file) => `users/${userId}/covers/${buildFileName(file.name)}`,
    rules: [IMAGE_RULE],
  },
  "resource-file": {
    bucket: STORAGE_BUCKETS.resourceFiles,
    maxFileCount: 1,
    pathPrefix: (userId, file) => `users/${userId}/resources/${buildFileName(file.name)}`,
    rules: [...RESOURCE_DOC_RULES],
  },
  "message-media": {
    bucket: STORAGE_BUCKETS.messageMedia,
    maxFileCount: 10,
    pathPrefix: (userId, file) => `users/${userId}/direct/${buildFileName(file.name)}`,
    rules: [
      { kind: "image", maxSize: 8 * 1024 * 1024 },
      { kind: "video", maxSize: MESSAGE_MEDIA_MAX_SIZE_BYTES },
      { kind: "audio", maxSize: 16 * 1024 * 1024 },
    ],
  },
  "channel-message-media": {
    bucket: STORAGE_BUCKETS.messageMedia,
    maxFileCount: 5,
    pathPrefix: (userId, file, context) =>
      `users/${userId}/channels/${context?.channelId || "unknown"}/${buildFileName(file.name)}`,
    rules: [...CHANNEL_ATTACHMENT_RULES],
  },
  "submission-attachment": {
    bucket: STORAGE_BUCKETS.submissionAttachments,
    maxFileCount: 5,
    pathPrefix: (userId, file, context) =>
      `users/${userId}/classwork/${context?.classworkId || "unknown"}/${buildFileName(file.name)}`,
    rules: [...SUBMISSION_RULES],
  },
}

function matchesRule(file: UploadFileMetadata, rule: FileTypeRule) {
  const mimeType = file.type.trim().toLowerCase()
  const extension = getSafeExtension(file.name)

  switch (rule.kind) {
    case "image":
      return mimeType.startsWith("image/")
    case "video":
      return mimeType.startsWith("video/")
    case "audio":
      return mimeType.startsWith("audio/")
    case "text":
      return mimeType.startsWith("text/") || extension === rule.extension
    case "exact":
      return mimeType === rule.mime || extension === rule.extension
  }
}

export function getUploadPurposeConfig(purpose: UploadPurpose) {
  return PURPOSE_CONFIG[purpose]
}

export function validateUploadFiles(purpose: UploadPurpose, files: UploadFileMetadata[]) {
  const config = PURPOSE_CONFIG[purpose]

  if (files.length === 0) {
    throw new Error("At least one file is required")
  }

  if (files.length > config.maxFileCount) {
    throw new Error(`You can upload up to ${config.maxFileCount} files at a time`)
  }

  for (const file of files) {
    const matchingRule = config.rules.find((rule) => matchesRule(file, rule))

    if (!matchingRule) {
      throw new Error(`Unsupported file type for ${purpose}`)
    }

    if (file.size > matchingRule.maxSize) {
      throw new Error(`${file.name} exceeds the allowed size limit`)
    }
  }
}

export function buildUploadPath(
  purpose: UploadPurpose,
  userId: string,
  file: UploadFileMetadata,
  context?: UploadContext,
) {
  return PURPOSE_CONFIG[purpose].pathPrefix(userId, file, context)
}

export function getBucketForPurpose(purpose: UploadPurpose) {
  return PURPOSE_CONFIG[purpose].bucket
}

const RESOURCE_FILE_TYPE_BY_EXTENSION = {
  pdf: "pdf",
  ppt: "ppt",
  pptx: "pptx",
  doc: "doc",
  docx: "docx",
  xls: "xls",
  xlsx: "xlsx",
  txt: "txt",
} as const

export function getResourceFileType(fileName: string) {
  const extension = getSafeExtension(fileName)
  return RESOURCE_FILE_TYPE_BY_EXTENSION[extension as keyof typeof RESOURCE_FILE_TYPE_BY_EXTENSION] || "other"
}
