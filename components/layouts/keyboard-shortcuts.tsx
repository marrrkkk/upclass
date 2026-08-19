"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

import { organizationPath, organizationSlugFromPathname } from "@/lib/organization-path"

const goShortcuts: Record<string, string> = {
  d: "/dashboard",
  c: "/classes",
  m: "/messages",
  r: "/resources",
}

const actionShortcuts: Record<string, string> = {
  a: "/classes",
  m: "/messages",
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tagName = target.tagName.toLowerCase()
  return tagName === "input" || tagName === "textarea" || tagName === "select"
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const pendingPrefixRef = useRef<{ prefix: "g" | "c"; timer: number } | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (typeof event.key !== "string") return
      const key = event.key.toLowerCase()

      if (key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault()
        const commandEvent = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
        document.dispatchEvent(commandEvent)
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return
      }

      const orgSlug = organizationSlugFromPathname(pathname)

      const pendingPrefix = pendingPrefixRef.current
      if (pendingPrefix) {
        const destination =
          pendingPrefix.prefix === "g" ? goShortcuts[key] : actionShortcuts[key]
        if (destination) {
          window.clearTimeout(pendingPrefix.timer)
          pendingPrefixRef.current = null
          router.push(organizationPath(orgSlug, destination))
          return
        }
      }

      if (key === "g" || key === "c") {
        if (pendingPrefix) {
          window.clearTimeout(pendingPrefix.timer)
        }
        pendingPrefixRef.current = {
          prefix: key,
          timer: window.setTimeout(() => {
            pendingPrefixRef.current = null
          }, 900),
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (pendingPrefixRef.current) {
        window.clearTimeout(pendingPrefixRef.current.timer)
      }
    }
  }, [pathname, router])

  return null
}
