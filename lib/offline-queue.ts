import { z } from "zod"

import {
  createClassSchema,
  createResourceSchema,
  joinClassSchema,
} from "@/lib/validation/actions"

const createAnnouncementPayloadSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  content: z.string().trim().min(1, "Content is required"),
  /** Client-generated ID of the optimistic announcement for queue reconciliation. */
  tempId: z.string().optional(),
})

const createClassworkPayloadSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  type: z.enum(["assignment", "quiz", "material"]).default("assignment"),
  dueDate: z.string().trim().optional(),
  points: z.string().trim().optional(),
  /** Client-generated ID of the optimistic classwork for queue reconciliation. */
  tempId: z.string().optional(),
})

const submitClassworkPayloadSchema = z
  .object({
    classworkId: z.string().min(1, "Classwork ID is required"),
    content: z.string().trim().optional(),
    attachments: z
      .array(
        z.object({
          fileUrl: z.string().trim().min(1, "Attachment URL is required"),
          fileName: z.string().trim().min(1, "Attachment name is required"),
          fileType: z.string().trim().optional(),
          fileSize: z.string().trim().optional(),
        }),
      )
      .default([]),
    mode: z.enum(["draft", "submit"]).default("submit"),
  })
  .refine((value) => !!value.content || value.attachments.length > 0, {
    message: "Content or file is required",
  })

const sendDirectMessagePayloadSchema = z
  .object({
    orgSlug: z.string().min(1, "Organization is required"),
    receiverId: z.string().min(1, "Receiver is required"),
    content: z.string().trim().optional(),
    media: z.string().trim().optional(),
    clientMessageId: z.string().trim().min(1).max(64),
  })
  .refine((value) => !!value.content || !!value.media, {
    message: "Message content or media is required",
  })

const sendChannelMessagePayloadSchema = z
  .object({
    orgSlug: z.string().min(1, "Organization is required"),
    channelId: z.string().min(1, "Channel is required"),
    content: z.string().trim().optional(),
    media: z.string().trim().optional(),
    clientMessageId: z.string().trim().min(1).max(64),
  })
  .refine((value) => !!value.content || !!value.media, {
    message: "Message content or media is required",
  })

const createQuizPayloadSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  payload: z.unknown(),
})

export const offlineActionPayloadSchemas = {
  "create-class": createClassSchema.extend({
    orgSlug: z.string().trim().min(1, "Organization is required"),
    /** Client-generated ID of the optimistic class for queue reconciliation. */
    tempId: z.string().optional(),
  }),
  "join-class": joinClassSchema,
  // Note: "create-resource" is intentionally excluded - resource uploads are online-only
  "create-announcement": createAnnouncementPayloadSchema,
  "create-classwork": createClassworkPayloadSchema,
  "submit-classwork": submitClassworkPayloadSchema,
  "send-direct-message": sendDirectMessagePayloadSchema,
  "send-channel-message": sendChannelMessagePayloadSchema,
  "create-quiz": createQuizPayloadSchema,
} as const

export type OfflineActionType = keyof typeof offlineActionPayloadSchemas

type OfflineActionPayloadMap = {
  [K in OfflineActionType]: z.infer<(typeof offlineActionPayloadSchemas)[K]>
}

export type OfflineActionPayload<T extends OfflineActionType = OfflineActionType> =
  OfflineActionPayloadMap[T]

export type QueuedActionStatus = "pending" | "syncing" | "failed"

type QueuedActionBase = {
  id: string
  createdAt: number
  updatedAt: number
  status: QueuedActionStatus
  attemptCount: number
  nextRetryAt: number
  lastError: string | null
  idempotencyKey: string
}

export type QueuedAction = {
  [K in OfflineActionType]: QueuedActionBase & {
    type: K
    payload: OfflineActionPayload<K>
  }
}[OfflineActionType]

const DB_NAME = "upclass-offline-queue"
const STORE_NAME = "pendingActions"
const DB_VERSION = 1
const QUEUE_CHANGE_EVENT = "upclass:offline-queue-changed"

function emitQueueChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGE_EVENT))
}

function createActionId(type: OfflineActionType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function createIdempotencyKey(type: OfflineActionType) {
  return `${type}-${crypto.randomUUID()}`
}

function retryDelayMs(attemptCount: number) {
  const base = 5_000
  const max = 5 * 60_000
  return Math.min(base * 2 ** Math.max(0, attemptCount - 1), max)
}

/**
 * How long a `syncing` claim is considered owned by its tab. Multi-tab sync
 * must not re-execute an action another tab is already processing, but a tab
 * that dies mid-sync must not leave the action stuck forever.
 */
const SYNC_CLAIM_STALE_MS = 30_000

function isRetryableError(error: string) {
  return !/(unauthorized|required|invalid|not found|already|cannot|only .* can|you are not)/i.test(
    error,
  )
}

class OfflineQueueStore {
  private db: IDBDatabase | null = null

  private async init() {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      throw new Error("IndexedDB is not available")
    }

    if (this.db) return this.db

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("status", "status", { unique: false })
          store.createIndex("nextRetryAt", "nextRetryAt", { unique: false })
          store.createIndex("createdAt", "createdAt", { unique: false })
        }
      }
    })

    return this.db
  }

  async getAll() {
    const db = await this.init()
    return await new Promise<QueuedAction[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const actions = (request.result || []) as QueuedAction[]
        resolve(actions.sort((left, right) => left.createdAt - right.createdAt))
      }
    })
  }

  async put(action: QueuedAction) {
    const db = await this.init()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(action)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
    emitQueueChange()
  }

  async delete(id: string) {
    const db = await this.init()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
    emitQueueChange()
  }

  async clear() {
    const db = await this.init()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
    emitQueueChange()
  }
}

const store = new OfflineQueueStore()

export async function enqueueOfflineAction<T extends OfflineActionType>(
  type: T,
  payload: OfflineActionPayload<T>,
) {
  const parsed = offlineActionPayloadSchemas[type].safeParse(payload)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid offline action payload")
  }

  const now = Date.now()
  const action = {
    id: createActionId(type),
    type,
    payload: parsed.data,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    attemptCount: 0,
    nextRetryAt: now,
    lastError: null,
    idempotencyKey: createIdempotencyKey(type),
  } as Extract<QueuedAction, { type: T }>

  await store.put(action)
  return action
}

export async function listOfflineActions() {
  return await store.getAll()
}

export async function countOfflineActions() {
  const actions = await listOfflineActions()
  return actions.length
}

export async function clearOfflineActions() {
  await store.clear()
}

export async function removeOfflineAction(id: string) {
  await store.delete(id)
}

async function markSyncing(action: QueuedAction) {
  await store.put({
    ...action,
    status: "syncing",
    updatedAt: Date.now(),
    lastError: null,
  })
}

async function markFailure(action: QueuedAction, error: string) {
  const attemptCount = action.attemptCount + 1
  const retryable = isRetryableError(error)
  await store.put({
    ...action,
    attemptCount,
    updatedAt: Date.now(),
    lastError: error,
    status: retryable ? "pending" : "failed",
    nextRetryAt: retryable ? Date.now() + retryDelayMs(attemptCount) : Number.MAX_SAFE_INTEGER,
  })
}

async function removeAction(id: string) {
  await store.delete(id)
}

function appendFormData(formData: FormData, payload: Record<string, unknown>, skipKeys: string[] = []) {
  if (!payload || typeof payload !== "object") return
  for (const [key, value] of Object.entries(payload)) {
    if (skipKeys.includes(key) || value == null) continue
    formData.append(key, String(value))
  }
}

async function processQueuedAction(action: QueuedAction) {
  switch (action.type) {
    case "create-class": {
      const { createClass } = await import("@/app/actions/classes")
      const formData = new FormData()
      appendFormData(formData, action.payload)
      return await createClass(formData)
    }
    case "join-class": {
      const { joinClass } = await import("@/app/actions/classes")
      const formData = new FormData()
      appendFormData(formData, action.payload)
      return await joinClass(formData)
    }
    // Note: "create-resource" case removed - resources are online-only due to file uploads
    case "create-announcement": {
      const { createAnnouncement } = await import("@/app/actions/class-detail")
      const formData = new FormData()
      appendFormData(formData, action.payload, ["classId"])
      return await createAnnouncement(action.payload.classId, formData)
    }
    case "create-classwork": {
      const { createClasswork } = await import("@/app/actions/class-detail")
      const formData = new FormData()
      appendFormData(formData, action.payload, ["classId"])
      return await createClasswork(action.payload.classId, formData)
    }
    case "submit-classwork": {
      const { submitClasswork } = await import("@/app/actions/class-detail")
      const formData = new FormData()
      appendFormData(formData, action.payload, ["classworkId", "attachments"])
      formData.append("attachments", JSON.stringify(action.payload.attachments))
      return await submitClasswork(action.payload.classworkId, formData)
    }
    case "send-direct-message": {
      const { sendMessage } = await import("@/app/actions/messages")
      return await sendMessage(
        { ...action.payload, content: action.payload.content || "" },
      )
    }
    case "send-channel-message": {
      const { sendChannelMessage } = await import("@/app/actions/messages")
      return await sendChannelMessage(
        { ...action.payload, content: action.payload.content || "" },
      )
    }
    case "create-quiz": {
      const { createQuiz } = await import("@/app/actions/quizzes")
      const formData = new FormData()
      formData.append("payload", JSON.stringify(action.payload.payload))
      return await createQuiz(action.payload.classId, formData)
    }
  }
}

export async function syncOfflineActions() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return
  }

  const actions = await listOfflineActions()
  const now = Date.now()

  for (const action of actions) {
    if (action.status === "failed") continue
    // Another tab (or a concurrent sync pass) owns fresh claims; only stale
    // claims from crashed tabs are re-processed.
    if (action.status === "syncing" && now - action.updatedAt < SYNC_CLAIM_STALE_MS) {
      continue
    }
    if (action.nextRetryAt > now) continue

    await markSyncing(action)

    try {
      const result = await processQueuedAction(action)
      if (result.success) {
        await removeAction(action.id)
      } else {
        await markFailure(action, result.error || "Failed to sync queued action")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync queued action"
      await markFailure(action, message)
    }
  }
}

export function subscribeToOfflineQueue(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handler = () => listener()
  window.addEventListener(QUEUE_CHANGE_EVENT, handler)
  return () => window.removeEventListener(QUEUE_CHANGE_EVENT, handler)
}
