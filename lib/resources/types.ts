export type ResourceAiStatus = "processing" | "ready" | "failed" | "unsupported"

export type ParsedResourceBlock = {
  text: string
  pageNumber?: number | null
  sectionLabel?: string | null
}

export type ParsedResourceDocument = {
  parser: string
  text: string
  blocks: ParsedResourceBlock[]
  pageCount: number
}

export type ChunkedResourceBlock = {
  chunkIndex: number
  text: string
  pageNumber: number | null
  sectionLabel: string | null
  tokenCount: number
}

export type ResourceCitation = {
  chunkId: string
  fileName: string
  pageNumber: number | null
  chunkIndex: number
  sectionLabel: string | null
}

export type ResourceChatMessageDto = {
  id: string
  role: "user" | "assistant"
  content: string
  citations: ResourceCitation[]
  createdAt: string
}
