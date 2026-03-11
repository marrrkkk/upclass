"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const PWA_PROMPT_SESSION_KEY = "pwa-install-prompt-seen"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      if (sessionStorage.getItem(PWA_PROMPT_SESSION_KEY) === "true") {
        return
      }

      e.preventDefault()
      sessionStorage.setItem(PWA_PROMPT_SESSION_KEY, "true")
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    sessionStorage.setItem(PWA_PROMPT_SESSION_KEY, "true")
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem(PWA_PROMPT_SESSION_KEY, "true")
  }

  if (!showPrompt || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install UpClass</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install our app for a better experience with offline support.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
