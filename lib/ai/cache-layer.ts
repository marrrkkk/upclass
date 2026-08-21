/**
 * Non-throwing cache layer.
 *
 * Upstash Redis REST with a transparent in-memory Map fallback so the app
 * works without Upstash env (per-instance degradation only). Every operation
 * warns and falls back instead of throwing.
 */
import { Redis } from "@upstash/redis"

export type CacheValue = string | number | boolean

const MEMORY_MAX_KEYS = 10_000
const memoryStore = new Map<string, { value: CacheValue; expiresAt: number }>()

function pruneMemory(now: number) {
  if (memoryStore.size < MEMORY_MAX_KEYS) return
  for (const [key, entry] of memoryStore) {
    if (now >= entry.expiresAt) {
      memoryStore.delete(key)
    }
  }
}

let redisSingleton: Redis | null | undefined

function getRedis(): Redis | null {
  if (redisSingleton === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    redisSingleton =
      url && token
        ? new Redis({ url, token, automaticDeserialization: false })
        : null
  }
  return redisSingleton
}

function memoryGet(key: string): CacheValue | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

function memorySet(key: string, value: CacheValue, ttlSeconds: number) {
  pruneMemory(Date.now())
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 })
}

/** Get a raw string value. Returns null on miss or when the cache is unavailable. */
export async function cacheGet(key: string): Promise<string | null> {
  const redisClient = getRedis()
  if (!redisClient) {
    const value = memoryGet(key)
    return value === null ? null : String(value)
  }

  try {
    const value = await redisClient.get<string>(key)
    return value ?? null
  } catch (error) {
    console.warn(`[ai-cache] get failed for ${key}:`, error)
    const value = memoryGet(key)
    return value === null ? null : String(value)
  }
}

/** Get a JSON value. Returns null on miss or parse failure. */
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Set a value with a TTL (seconds). Never throws. */
export async function cacheSet(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
  const redisClient = getRedis()
  memorySet(key, value, ttlSeconds)

  if (!redisClient) return

  try {
    await redisClient.set(key, String(value), { ex: ttlSeconds })
  } catch (error) {
    console.warn(`[ai-cache] set failed for ${key}:`, error)
  }
}

/** Set only when the key does not exist yet. Returns true when set. Never throws. */
export async function cacheSetIfAbsent(
  key: string,
  value: CacheValue,
  ttlSeconds: number,
): Promise<boolean> {
  const redisClient = getRedis()

  if (!redisClient) {
    if (memoryGet(key) !== null) return false
    memorySet(key, value, ttlSeconds)
    return true
  }

  try {
    const result = await redisClient.set(key, String(value), { ex: ttlSeconds, nx: true })
    return result === "OK"
  } catch (error) {
    console.warn(`[ai-cache] setnx failed for ${key}:`, error)
    if (memoryGet(key) !== null) return false
    memorySet(key, value, ttlSeconds)
    return true
  }
}

/**
 * Increment a counter, setting the TTL on first increment (seconds).
 * Returns the new count, or -1 when unavailable.
 */
export async function cacheIncrement(key: string, ttlSeconds: number): Promise<number> {
  const redisClient = getRedis()

  if (!redisClient) {
    const current = memoryGet(key)
    const next = (typeof current === "number" ? current : 0) + 1
    memorySet(key, next, ttlSeconds)
    return next
  }

  try {
    const pipe = redisClient.pipeline()
    pipe.incr(key)
    pipe.expire(key, ttlSeconds)
    const results = await pipe.exec()
    const count = results?.[0] as number | undefined
    return typeof count === "number" ? count : -1
  } catch (error) {
    console.warn(`[ai-cache] increment failed for ${key}:`, error)
    const current = memoryGet(key)
    const next = (typeof current === "number" ? current : 0) + 1
    memorySet(key, next, ttlSeconds)
    return next
  }
}

/** Delete a key. Never throws. */
export async function cacheDelete(key: string): Promise<void> {
  memoryStore.delete(key)
  const redisClient = getRedis()
  if (!redisClient) return
  try {
    await redisClient.del(key)
  } catch (error) {
    console.warn(`[ai-cache] delete failed for ${key}:`, error)
  }
}