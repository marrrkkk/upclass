"use client"

const RECENT_CLASS_VISITS_KEY = "upclass-recent-class-visits"
const MAX_RECENT_CLASS_VISITS = 20
const RECENT_CLASS_VISITS_UPDATED_EVENT = "upclass:recent-class-visits-updated"

type RecentClassVisit = {
  classId: string
  openedAt: number
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function getStoredVisitsRaw() {
  if (!canUseLocalStorage()) return "[]"

  return window.localStorage.getItem(RECENT_CLASS_VISITS_KEY) ?? "[]"
}

function parseVisits(raw: string): RecentClassVisit[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is RecentClassVisit => {
      return !!entry
        && typeof entry === "object"
        && typeof entry.classId === "string"
        && typeof entry.openedAt === "number"
    })
  } catch {
    return []
  }
}

function readVisits(): RecentClassVisit[] {
  return parseVisits(getStoredVisitsRaw())
}

function writeVisits(visits: RecentClassVisit[]) {
  if (!canUseLocalStorage()) return

  window.localStorage.setItem(
    RECENT_CLASS_VISITS_KEY,
    JSON.stringify(visits.slice(0, MAX_RECENT_CLASS_VISITS)),
  )
  window.dispatchEvent(new Event(RECENT_CLASS_VISITS_UPDATED_EVENT))
}

export function recordRecentClassVisit(classId: string) {
  if (!classId) return

  const deduped = readVisits().filter((entry) => entry.classId !== classId)
  deduped.unshift({
    classId,
    openedAt: Date.now(),
  })
  writeVisits(deduped)
}

export function sortItemsByRecentClassVisit<T>(items: T[], getClassId: (item: T) => string) {
  if (!items.length) return items

  const visits = readVisits()
  return sortItemsByRecentClassVisitSnapshot(items, visits, getClassId)
}

export function sortItemsByRecentClassVisitSnapshot<T>(
  items: T[],
  visits: RecentClassVisit[],
  getClassId: (item: T) => string,
) {
  if (!items.length) return items
  if (!visits.length) return items

  const visitIndex = new Map(visits.map((entry, index) => [entry.classId, index]))

  return [...items].sort((left, right) => {
    const leftIndex = visitIndex.get(getClassId(left))
    const rightIndex = visitIndex.get(getClassId(right))

    if (leftIndex === undefined && rightIndex === undefined) return 0
    if (leftIndex === undefined) return 1
    if (rightIndex === undefined) return -1
    return leftIndex - rightIndex
  })
}

export function subscribeToRecentClassVisits(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleChange = () => onStoreChange()

  window.addEventListener("storage", handleChange)
  window.addEventListener(RECENT_CLASS_VISITS_UPDATED_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(RECENT_CLASS_VISITS_UPDATED_EVENT, handleChange)
  }
}

export function getRecentClassVisitsSnapshot() {
  return getStoredVisitsRaw()
}

export function getRecentClassVisitsServerSnapshot() {
  return "[]"
}

export function parseRecentClassVisitsSnapshot(snapshot: string) {
  return parseVisits(snapshot)
}
