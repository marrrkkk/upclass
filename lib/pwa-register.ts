"use client"

import { setPWAStandalone, setPWAUpdateAvailable } from "@/lib/pwa-state"

type RegisterServiceWorkerOptions = {
  onUpdateReady?: (registration: ServiceWorkerRegistration) => void
  onOfflineReady?: () => void
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null
let refreshRequested = false
const isProduction = process.env.NODE_ENV === "production"

function onControllerChange() {
  if (refreshRequested) {
    refreshRequested = false
    window.location.reload()
    return
  }

  setPWAUpdateAvailable(false)
}

async function registerWorker(options: RegisterServiceWorkerOptions) {
  if (!("serviceWorker" in navigator)) return

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("Service Worker registered:", serviceWorkerRegistration.scope)
    options.onOfflineReady?.()

    serviceWorkerRegistration.addEventListener("updatefound", () => {
      const newWorker = serviceWorkerRegistration?.installing
      if (!newWorker) return

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setPWAUpdateAvailable(true)
          options.onUpdateReady?.(serviceWorkerRegistration as ServiceWorkerRegistration)
        }
      })
    })

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "OFFLINE_READY") {
        options.onOfflineReady?.()
      }
    })

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "WARM_CORE_ROUTES" })
    }
  } catch (error) {
    console.error("Service Worker registration failed:", error)
  }
}

async function unregisterWorkersForDevelopment() {
  if (!("serviceWorker" in navigator) || typeof window === "undefined") return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ("caches" in window) {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("upclass-"))
        .map((cacheName) => caches.delete(cacheName)),
    )
  }
}

export function registerServiceWorker(options: RegisterServiceWorkerOptions = {}) {
  if (typeof window === "undefined") return

  if (!isProduction) {
    void unregisterWorkersForDevelopment()
    return
  }

  setPWAStandalone(
    window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  )

  if (document.readyState === "complete") {
    void registerWorker(options)
    return
  }

  window.addEventListener(
    "load",
    () => {
      void registerWorker(options)
    },
    { once: true }
  )
}

export async function applyPendingAppUpdate() {
  if (typeof window === "undefined") return false

  if (!serviceWorkerRegistration?.waiting) {
    return false
  }

  refreshRequested = true
  serviceWorkerRegistration.waiting.postMessage({ type: "SKIP_WAITING" })
  return true
}

export function unregisterServiceWorker() {
  if (typeof window === "undefined") return

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister()
    })
  }
}
