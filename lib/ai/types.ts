/**
 * Shared domain types for the AI assistant.
 */

export type AiSurface = "dashboard" | "class" | "resource" | "study"
/** All surfaces that can host an AI run (assistant + feature surfaces). */
export type AiRunSurface = "dashboard" | "class" | "resource" | "study" | "quiz" | "pulse"
export type AiMessageRole = "user" | "assistant" | "system"
export type AiMessageStatus = "completed" | "generating" | "failed"

export type AiConversationRow = {
  id: string
  userId: string
  orgId: string
  surface: AiSurface
  entityId: string
  title: string
  isDefault: boolean
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type AiMessageRow = {
  id: string
  conversationId: string
  role: AiMessageRole
  content: string
  provider: string | null
  model: string | null
  status: AiMessageStatus
  metadata: Record<string, unknown>
  clientMessageId: string | null
  createdAt: Date
  updatedAt: Date
}

export type AiMessagesPage = {
  messages: AiMessageRow[]
  nextCursor: string | null
  hasMore: boolean
}

export type AssistantErrorReason =
  | "rate_limit"
  | "budget_exceeded"
  | "provider_failure"
  | "sanitize_rejected"
  | "dedup"
  | "other"

export type AssistantMessageMetadata = {
  errorReason?: AssistantErrorReason
  latencyMs?: number
  toolCalls?: number
  steps?: number
  modelId?: string
  structuredOutputs?: unknown[]
  actionProposals?: Array<{ action: string; payload: unknown }>
}

/** Execution context handed to every tool executor. */
export type AiToolExecutionContext = {
  orgId: string
  orgSlug: string
  userId: string
  /** "teacher" for owners/admins/class teachers, "student" otherwise. */
  role: "teacher" | "student"
  /** Turn correlation id for tool-event logging. */
  runId?: string
  /** Assistant message id for tool-event logging. */
  messageId?: string
  /** Optional resource context for resource-scoped conversations. */
  resourceContext?: AiResourceContext
}

/** Resource context for resource-scoped AI conversations. */
export type AiResourceContext = {
  resourceId: string
  title: string
  description: string | null
  category: string | null
  fileType: string
  fileName: string
  /** Extracted source text, treated as untrusted quoted content. */
  sourceText: string
}

export type AiMemoryCategory =
  | "teaching_rules"
  | "subject_knowledge"
  | "class_context"
  | "workflow_preferences"

export type AiIntent =
  | "data_query"
  | "classwork_action"
  | "quiz_action"
  | "analytics"
  | "general_question"
  | "memory_recall"
  | "workflow_guidance"

/**
 * Sensitivity class for a single AI run. Drives provider allowlisting: a
 * provider failure must never route sensitive data to an unapproved model.
 */
export type AiSensitivity = "public_class" | "org_context" | "student_linked" | "highly_sensitive"

/** Shared runtime contract carried by every AI run across all surfaces. */
export type AiRunContext = {
  runId: string
  userId: string
  orgId: string
  role: "teacher" | "student"
  surface: AiRunSurface
  sensitivity: AiSensitivity
  requestId?: string
}

/**
 * A source reference backing an AI claim. Tools return these alongside their
 * display text; the UI renders them as compact source chips.
 */
export type AiSourceRef = {
  kind:
    | "class"
    | "classwork"
    | "quiz"
    | "submission"
    | "resource"
    | "activity"
    | "memory"
  id: string
  label: string
  href?: string
}
