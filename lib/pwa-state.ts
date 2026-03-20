"use client"

import { create } from "zustand"

export type PWAInstallPlatform = "chromium" | "ios" | null
export type PWABannerTone = "offline" | "syncing" | "update" | "online"

type PWAState = {
  pathname: string
  online: boolean
  syncing: boolean
  cacheReady: boolean
  updateAvailable: boolean
  installPromptReady: boolean
  installPlatform: PWAInstallPlatform
  installDismissed: boolean
  offlineBannerDismissed: boolean
  standalone: boolean
  warmedRoutes: string[]
  lastConnectionChangeAt: number | null
  lastSyncAt: number | null
  pendingActions: number
  setPathname: (pathname: string) => void
  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  setCacheReady: (cacheReady: boolean) => void
  setUpdateAvailable: (updateAvailable: boolean) => void
  setInstallPromptSurface: (platform: PWAInstallPlatform, ready: boolean) => void
  clearInstallPrompt: () => void
  dismissInstallPrompt: () => void
  setOfflineBannerDismissed: (dismissed: boolean) => void
  setStandalone: (standalone: boolean) => void
  markRouteWarm: (pathname: string) => void
  setLastConnectionChangeAt: (timestamp: number | null) => void
  setLastSyncAt: (timestamp: number | null) => void
  setPendingActions: (count: number) => void
}

const WARMED_ROUTES_KEY = "upclass-pwa-warmed-routes"
const INSTALL_DISMISSED_KEY = "upclass-pwa-install-dismissed"
const MAX_WARMED_ROUTES = 24

const CORE_ROUTE_PREFIXES = [
  "/home",
  "/activity",
  "/classes",
  "/resources",
  "/messages",
  "/notifications",
  "/profile",
  "/settings",
]

function isBrowser() {
  return typeof window !== "undefined"
}

function normalizePathname(pathname?: string | null) {
  if (!pathname) return "/"

  const [path] = pathname.split("?")
  const normalized = path.replace(/\/+$/, "")

  return normalized || "/"
}

function readStoredRoutes() {
  if (!isBrowser()) return [] as string[]

  try {
    const stored = window.localStorage.getItem(WARMED_ROUTES_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((value): value is string => typeof value === "string")
  } catch {
    return []
  }
}

function writeStoredRoutes(routes: string[]) {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(WARMED_ROUTES_KEY, JSON.stringify(routes.slice(0, MAX_WARMED_ROUTES)))
  } catch {
    return
  }
}

function readDismissedInstallPrompt() {
  if (!isBrowser()) return false

  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true"
  } catch {
    return false
  }
}

function writeDismissedInstallPrompt(dismissed: boolean) {
  if (!isBrowser()) return

  try {
    if (dismissed) {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true")
    } else {
      window.localStorage.removeItem(INSTALL_DISMISSED_KEY)
    }
  } catch {
    return
  }
}

function isStandaloneMode() {
  if (!isBrowser()) return false

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function detectInstallPlatform(): PWAInstallPlatform {
  if (!isBrowser() || isStandaloneMode()) return null

  const userAgent = navigator.userAgent.toLowerCase()
  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

  return isIos ? "ios" : null
}

function getRouteLabel(pathname: string) {
  const normalized = normalizePathname(pathname)

  if (normalized === "/" || normalized === "/home") return "Home"
  if (normalized.startsWith("/classes")) return "Classes"
  if (normalized.startsWith("/resources")) return "Resources"
  if (normalized.startsWith("/messages")) return "Messages"
  if (normalized.startsWith("/notifications")) return "Notifications"
  if (normalized.startsWith("/profile")) return "Profile"
  if (normalized.startsWith("/settings")) return "Settings"

  return "This page"
}

function isCoreRoute(pathname: string) {
  const normalized = normalizePathname(pathname)
  return CORE_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
}

function isRouteWarm(pathname: string, warmedRoutes: string[]) {
  const normalized = normalizePathname(pathname)
  return warmedRoutes.some((route) => {
    const warmed = normalizePathname(route)
    return normalized === warmed || normalized.startsWith(`${warmed}/`)
  })
}

function initialState() {
  const warmedRoutes = readStoredRoutes()
  const installPlatform = detectInstallPlatform()
  const standalone = isStandaloneMode()

  return {
    pathname: "/",
    online: true,
    syncing: false,
    cacheReady: warmedRoutes.length > 0,
    updateAvailable: false,
    installPromptReady: installPlatform === "ios",
    installPlatform,
    installDismissed: readDismissedInstallPrompt(),
    offlineBannerDismissed: false,
    standalone,
    warmedRoutes,
    lastConnectionChangeAt: null,
    lastSyncAt: null,
    pendingActions: 0,
  }
}

export const usePWAState = create<PWAState>((set, get) => ({
  ...initialState(),
  setPathname: (pathname) => {
    set({ pathname: normalizePathname(pathname) })
    if (isBrowser() && get().online && isCoreRoute(pathname)) {
      get().markRouteWarm(pathname)
    }
  },
  setOnline: (online) =>
    set({
      online,
      syncing: online ? get().syncing : false,
      offlineBannerDismissed: false,
      lastConnectionChangeAt: Date.now(),
    }),
  setSyncing: (syncing) => set({ syncing }),
  setCacheReady: (cacheReady) => set({ cacheReady }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setInstallPromptSurface: (platform, ready) => {
    if (get().standalone) return

    set({
      installPlatform: platform,
      installPromptReady: ready,
    })
  },
  clearInstallPrompt: () => {
    writeDismissedInstallPrompt(false)
    set({
      installPromptReady: false,
      installPlatform: detectInstallPlatform(),
      installDismissed: false,
    })
  },
  dismissInstallPrompt: () => {
    writeDismissedInstallPrompt(true)
    set({ installDismissed: true })
  },
  setOfflineBannerDismissed: (dismissed) => set({ offlineBannerDismissed: dismissed }),
  setStandalone: (standalone) =>
    set({
      standalone,
      installPromptReady: standalone ? false : get().installPromptReady,
      installPlatform: standalone ? null : get().installPlatform,
      installDismissed: standalone ? false : get().installDismissed,
    }),
  markRouteWarm: (pathname) => {
    const normalized = normalizePathname(pathname)
    if (!isCoreRoute(normalized)) return

    const current = get().warmedRoutes
    const nextRoutes = [normalized, ...current.filter((route) => normalizePathname(route) !== normalized)]
    const uniqueRoutes = Array.from(new Set(nextRoutes)).slice(0, MAX_WARMED_ROUTES)

    writeStoredRoutes(uniqueRoutes)
    set({
      warmedRoutes: uniqueRoutes,
      cacheReady: true,
    })
  },
  setLastConnectionChangeAt: (timestamp) => set({ lastConnectionChangeAt: timestamp }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setPendingActions: (count) => set({ pendingActions: count }),
}))

export function detectPWAInstallPlatform() {
  return detectInstallPlatform()
}

export function isStandaloneApp() {
  return isStandaloneMode()
}

export function normalizePWAPathname(pathname?: string | null) {
  return normalizePathname(pathname)
}

export function getPWARouteLabel(pathname: string) {
  return getRouteLabel(pathname)
}

export function isPWARouteWarm(pathname: string, warmedRoutes: string[] = usePWAState.getState().warmedRoutes) {
  return isRouteWarm(pathname, warmedRoutes)
}

export function isPWAInstallPromptVisible(
  currentState: Pick<PWAState, "standalone" | "installPromptReady" | "installDismissed"> = usePWAState.getState(),
) {
  return !currentState.standalone && currentState.installPromptReady && !currentState.installDismissed
}

export function getPWAState() {
  return usePWAState.getState()
}

export function setPWAPathname(pathname: string) {
  usePWAState.getState().setPathname(pathname)
}

export function setPWAConnectionState(online: boolean) {
  usePWAState.getState().setOnline(online)
}

export function setPWASyncing(syncing: boolean) {
  usePWAState.getState().setSyncing(syncing)
}

export function setPWACacheReady(cacheReady: boolean) {
  usePWAState.getState().setCacheReady(cacheReady)
}

export function setPWAUpdateAvailable(updateAvailable: boolean) {
  usePWAState.getState().setUpdateAvailable(updateAvailable)
}

export function setPWAInstallPromptSurface(platform: PWAInstallPlatform, ready: boolean) {
  usePWAState.getState().setInstallPromptSurface(platform, ready)
}

export function clearPWAInstallPrompt() {
  usePWAState.getState().clearInstallPrompt()
}

export function dismissPWAInstallPrompt() {
  usePWAState.getState().dismissInstallPrompt()
}

export function setPWAOfflineBannerDismissed(dismissed: boolean) {
  usePWAState.getState().setOfflineBannerDismissed(dismissed)
}

export function setPWAStandalone(standalone: boolean) {
  usePWAState.getState().setStandalone(standalone)
}

export function markRouteWarm(pathname: string) {
  usePWAState.getState().markRouteWarm(pathname)
}

export function setPWALastSyncAt(timestamp: number | null) {
  usePWAState.getState().setLastSyncAt(timestamp)
}

export function setPWAPendingActions(count: number) {
  usePWAState.getState().setPendingActions(count)
}

export type PWAIndicatorState = {
  visible: boolean
  tone: PWABannerTone
  title: string
  description: string
  routeLabel: string
  routeWarm: boolean
  actionLabel?: string
}

export function getPWAIndicatorState(
  currentState: Pick<
    PWAState,
    | "pathname"
    | "online"
    | "syncing"
    | "cacheReady"
    | "updateAvailable"
    | "installPromptReady"
    | "installPlatform"
    | "installDismissed"
    | "offlineBannerDismissed"
    | "standalone"
    | "warmedRoutes"
    | "lastConnectionChangeAt"
    | "lastSyncAt"
    | "pendingActions"
  > = usePWAState.getState(),
): PWAIndicatorState {
  const routeLabel = getRouteLabel(currentState.pathname)
  const routeWarm = isRouteWarm(currentState.pathname, currentState.warmedRoutes)

  if (currentState.updateAvailable) {
    return {
      visible: true,
      tone: "update",
      title: "Update ready",
      description: "A newer version of UpClass is available. Refresh when you are ready.",
      routeLabel,
      routeWarm,
      actionLabel: "Refresh",
    }
  }

  if (!currentState.online) {
    return {
      visible: !currentState.offlineBannerDismissed,
      tone: "offline",
      title: "Offline",
      description: routeWarm
        ? `${routeLabel} is available from cache. Changes will sync when you reconnect.`
        : `${routeLabel} is limited offline, but the app shell stays ready.`,
      routeLabel,
      routeWarm,
    }
  }

  if (currentState.syncing) {
    return {
      visible: true,
      tone: "syncing",
      title: "Syncing changes",
      description:
        currentState.pendingActions > 0
          ? `Syncing ${currentState.pendingActions} queued change${currentState.pendingActions === 1 ? "" : "s"}.`
          : "Reconnecting and checking for queued changes.",
      routeLabel,
      routeWarm,
    }
  }

  return {
    visible: false,
    tone: "online",
    title: "Back online",
    description: currentState.lastSyncAt ? "Queued changes are up to date." : "Connection restored.",
    routeLabel,
    routeWarm,
  }
}

export async function probePwaCacheAvailability() {
  if (!isBrowser()) return false

  try {
    if (readStoredRoutes().length > 0) return true

    if ("caches" in window) {
      const cacheNames = await caches.keys()
      return cacheNames.some((cacheName) => cacheName.startsWith("upclass-"))
    }
  } catch {
    return false
  }

  return false
}
