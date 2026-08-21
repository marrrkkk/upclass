"use client"

import { useEffect, useState } from "react"
import { Download, Share2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import {
  clearPWAInstallPrompt,
  dismissPWAInstallPrompt,
  getPWAState,
  isPWAInstallPromptVisible,
  setPWAInstallPromptSurface,
  setPWAStandalone,
  usePWAState,
} from "@/lib/pwa-state"

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleDismiss()
      }}
    >
      <DialogContent className="sm:max-w-xl" showCloseButton={false}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          className="absolute right-4 top-4"
          aria-label="Dismiss install prompt"
        >
          <X aria-hidden="true" />
        </Button>

        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3 text-left">
            <IconBadge tone="primary" size="lg">
              <Download aria-hidden="true" />
            </IconBadge>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>Install UpClass</DialogTitle>
                <StatusBadge tone="neutral">
                  {isIos ? "iPhone or iPad" : "Browser install"}
                </StatusBadge>
              </div>
              <DialogDescription>
                Add UpClass to this device for quicker access and supported offline routes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isIos ? (
          <Panel variant="sunken" padding="sm" className="space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="size-4 text-muted-foreground" aria-hidden="true" />
              <Text variant="h4">Install from Safari</Text>
            </div>
            <ol className="list-decimal space-y-2 pl-5 type-small text-muted-foreground">
              <li>Tap the Share button in Safari.</li>
              <li>Choose “Add to Home Screen.”</li>
              <li>Open UpClass from your Home Screen.</li>
            </ol>
          </Panel>
        ) : (
          <Text variant="small" tone="muted">
            Your browser will confirm installation before adding the app.
          </Text>
        )}

        <DialogFooter>
          {deferredPrompt && !isIos ? (
            <>
              <Button type="button" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
              <Button type="button" onClick={() => void handleInstall()}>
                Install now
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleDismiss}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
