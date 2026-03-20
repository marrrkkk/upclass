"use client"

import { useEffect, useState } from "react"
import { Download, Share2, Sparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  clearPWAInstallPrompt,
  dismissPWAInstallPrompt,
  getPWAState,
  isPWAInstallPromptVisible,
  setPWAInstallPromptSurface,
  setPWAStandalone,
  usePWAState,
} from "@/lib/pwa-state"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const state = usePWAState((current) => current)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const shouldShow = isPWAInstallPromptVisible(state)
  const isIos = state.installPlatform === "ios"

  useEffect(() => {
    setPWAStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    )

    const handleBeforeInstallPrompt = (event: Event) => {
      if (getPWAState().installDismissed) {
        event.preventDefault()
        setPWAInstallPromptSurface("chromium", false)
        return
      }

      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setPWAInstallPromptSurface("chromium", true)
    }

    const handleAppInstalled = () => {
      clearPWAInstallPrompt()
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleDismiss = () => {
    dismissPWAInstallPrompt()
    setDeferredPrompt(null)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      clearPWAInstallPrompt()
    } else {
      handleDismiss()
    }

    setDeferredPrompt(null)
  }

  if (!shouldShow || state.standalone) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/45 px-3 pb-3 pt-16 backdrop-blur-[2px] sm:px-4 sm:pb-4">
      <div
        className={cn(
          "relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))] text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)]",
          "animate-in slide-in-from-bottom-6 duration-300",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <Download className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="pwa-install-title" className="text-lg font-semibold tracking-tight">
                Install UpClass
              </h2>
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                {isIos ? "iPhone / iPad" : "Android / desktop"}
              </Badge>
            </div>

            <p id="pwa-install-description" className="mt-2 text-sm leading-6 text-white/80">
              Add UpClass to your home screen for faster launch, a cleaner mobile view, and better offline access.
            </p>

            {isIos ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Install from Safari
                </div>
                <ol className="mt-3 space-y-2 text-sm text-white/80">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      1
                    </span>
                    <span>Tap the Share button in Safari.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      2
                    </span>
                    <span>Choose “Add to Home Screen.”</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      3
                    </span>
                    <span>Open UpClass from your Home Screen.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                Install now to keep the app ready offline and launch it like a native app.
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {deferredPrompt && !isIos ? (
                <Button
                  type="button"
                  onClick={handleInstall}
                  className="h-11 rounded-full bg-white px-5 font-semibold text-slate-950 hover:bg-white/90"
                >
                  Install now
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleDismiss}
                  className="h-11 rounded-full bg-white px-5 font-semibold text-slate-950 hover:bg-white/90"
                >
                  Got it
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                className="h-11 rounded-full border-white/15 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Not now
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-white/55">
          <Share2 className="h-3.5 w-3.5" />
          {isIos
            ? "Safari will use the system share sheet to install."
            : "Installation will be handled by your browser when supported."}
        </div>
      </div>
    </div>
  )
}
