// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest"

/* --------------------------------------------------------------------------
 * Minimal in-memory IndexedDB used by lib/offline-queue.ts. jsdom does not
 * ship IndexedDB; the queue only uses open + one object store with
 * getAll/put/delete/clear, which this mock covers. One shared record map
 * backs every open so the module's store singleton and test seeding always
 * see the same data.
 * ------------------------------------------------------------------------ */

type StoredRecord = Record<string, unknown> & { id: string }

const records = new Map<string, StoredRecord>()

function makeRequest(result: unknown) {
  const request: {
    result: unknown
    onerror: (() => void) | null
    onsuccess: (() => void) | null
  } = { result, onerror: null, onsuccess: null }
  queueMicrotask(() => request.onsuccess?.())
  return request
}

const objectStore = {
  put: (value: StoredRecord) => {
    records.set(value.id, structuredClone(value))
    return makeRequest(undefined)
  },
  getAll: () => makeRequest(Array.from(records.values()).map((v) => structuredClone(v))),
  delete: (id: string) => {
    records.delete(id)
    return makeRequest(undefined)
  },
  clear: () => {
    records.clear()
    return makeRequest(undefined)
  },
}

function installFakeIndexedDB() {
  const fakeIndexedDB = {
    open: (_name: string, _version?: number) => {
      const listeners: Record<string, ((event?: unknown) => void)[]> = {}
      const request = {
        result: undefined as unknown,
        error: null as Error | null,
        onerror: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
        addEventListener: (type: string, handler: (event?: unknown) => void) => {
          listeners[type] = listeners[type] || []
          listeners[type].push(handler)
        },
        dispatch: (type: string) => {
          queueMicrotask(() => {
            if (type === "upgradeneeded") {
              request.onupgradeneeded?.()
              for (const handler of listeners[type] || []) handler()
            }
            if (type === "success") {
              request.onsuccess?.()
              for (const handler of listeners[type] || []) handler()
            }
          })
        },
      }

      const db = {
        transaction: (_store: string, _mode: string) => ({
          objectStore: () => objectStore,
        }),
        objectStoreNames: { contains: () => true },
        createObjectStore: () => ({
          createIndex: () => ({}),
        }),
      }

      request.result = db
      request.dispatch("upgradeneeded")
      request.dispatch("success")
      return request
    },
  }

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: fakeIndexedDB,
  })
  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: fakeIndexedDB,
  })
}

installFakeIndexedDB()

/* --------------------------------------------------------------------------
 * Module under test
 * ------------------------------------------------------------------------ */

const createClassMock = vi.fn()
const joinClassMock = vi.fn()

vi.mock("@/app/actions/classes", () => ({
  createClass: createClassMock,
  joinClass: joinClassMock,
}))

import {
  enqueueOfflineAction,
  listOfflineActions,
  syncOfflineActions,
} from "@/lib/offline-queue"

describe("offline queue sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    records.clear()
    createClassMock.mockResolvedValue({ success: true })
    joinClassMock.mockResolvedValue({ success: true })
  })

  function seedAction(overrides: Partial<Record<string, unknown>>) {
    objectStore.put({
      id: "seed-action",
      type: "create-class",
      payload: { orgSlug: "school", title: "Seed", gradeLevel: "college", tempId: "temp-1" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "pending",
      attemptCount: 0,
      nextRetryAt: 0,
      lastError: null,
      idempotencyKey: "seed-key",
      ...overrides,
    } as StoredRecord)
  }

  test("executes each due pending action exactly once", async () => {
    await enqueueOfflineAction("create-class", {
      orgSlug: "school",
      title: "Math",
      gradeLevel: "college",
      color: "blue",
      tempId: "temp-1",
    })
    await enqueueOfflineAction("create-class", {
      orgSlug: "school",
      title: "Science",
      gradeLevel: "college",
      color: "green",
      tempId: "temp-2",
    })

    await syncOfflineActions()
    await syncOfflineActions()

    expect(createClassMock).toHaveBeenCalledTimes(2)
    expect(await listOfflineActions()).toEqual([])
  })

  test("skips actions currently claimed by another tab to avoid duplicates", async () => {
    await seedAction({
      status: "syncing",
      updatedAt: Date.now(),
      nextRetryAt: 0,
    })

    await syncOfflineActions()

    expect(createClassMock).not.toHaveBeenCalled()
    const remaining = await listOfflineActions()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe("syncing")
  })

  test("reclaims stale syncing claims left by a crashed tab", async () => {
    await seedAction({
      status: "syncing",
      updatedAt: Date.now() - 31_000,
      nextRetryAt: 0,
    })

    await syncOfflineActions()

    expect(createClassMock).toHaveBeenCalledTimes(1)
    expect(await listOfflineActions()).toEqual([])
  })

  test("never retries actions that permanently failed", async () => {
    await seedAction({ status: "failed", nextRetryAt: 0 })

    await syncOfflineActions()

    expect(createClassMock).not.toHaveBeenCalled()
    const remaining = await listOfflineActions()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe("failed")
  })

  test("reschedules retryable failures with exponential backoff", async () => {
    createClassMock.mockResolvedValueOnce({ success: false, error: "boom" })
    await seedAction({ status: "pending", nextRetryAt: 0, attemptCount: 0 })

    await syncOfflineActions()

    const remaining = await listOfflineActions()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe("pending")
    expect(remaining[0].attemptCount).toBe(1)
    expect(remaining[0].lastError).toBe("boom")
    expect(remaining[0].nextRetryAt).toBeGreaterThan(Date.now())
  })

  test("marks permanent failures as failed instead of retrying", async () => {
    createClassMock.mockResolvedValueOnce({ success: false, error: "Unauthorized" })
    await seedAction({ status: "pending", nextRetryAt: 0 })

    await syncOfflineActions()

    const remaining = await listOfflineActions()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe("failed")
    expect(remaining[0].nextRetryAt).toBe(Number.MAX_SAFE_INTEGER)
  })
})