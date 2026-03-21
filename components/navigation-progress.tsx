"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

export function NavigationProgress() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const targetUrlRef = useRef<string | null>(null)
  const currentUrl = `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`

  useEffect(() => {
    if (targetUrlRef.current && currentUrl === targetUrlRef.current) {
      targetUrlRef.current = null
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setIsNavigating(false)
      frameRef.current = null
    })

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [currentUrl])

  useEffect(() => {
    const beginNavigation = (href: string) => {
      if (!href || href === currentUrl) return

      targetUrlRef.current = href
      setIsNavigating(true)

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        setIsNavigating(false)
        timeoutRef.current = null
      }, 12000)
    }

    const maybePrefetch = (href: string) => {
      if (!href) return
      router.prefetch(href)
    }

    const resolveInternalHref = (element: Element | null) => {
      const anchor = element?.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return null
      if (anchor.target && anchor.target !== "_self") return null
      if (anchor.hasAttribute("download")) return null

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return null

      const url = new URL(href, window.location.origin)
      if (url.origin !== window.location.origin) return null

      return {
        href: `${url.pathname}${url.search}`,
        skipProgress: anchor.dataset.skipNavigationProgress === "true",
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const resolved = resolveInternalHref(event.target instanceof Element ? event.target : null)
      if (!resolved) return

      if (!resolved.skipProgress) {
        beginNavigation(resolved.href)
      }
    }

    const handlePointerEnter = (event: Event) => {
      const resolved = resolveInternalHref(event.target instanceof Element ? event.target : null)
      if (!resolved) return
      maybePrefetch(resolved.href)
    }

    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target
      const resolved = resolveInternalHref(target instanceof Element ? target : null)
      if (!resolved) return

      maybePrefetch(resolved.href)
      if (!resolved.skipProgress) {
        beginNavigation(resolved.href)
      }
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("mouseover", handlePointerEnter, true)
    document.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true })

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("mouseover", handlePointerEnter, true)
      document.removeEventListener("touchstart", handleTouchStart, true)

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [currentUrl, router])

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[10000] h-1 origin-left transition-opacity duration-200",
          isNavigating ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="h-full w-full animate-[navigation-progress_1.1s_ease-in-out_infinite] bg-[linear-gradient(90deg,#0f172a_0%,#2563eb_45%,#38bdf8_100%)] shadow-[0_0_18px_rgba(37,99,235,0.35)]" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-[55] bg-background/0 transition-colors duration-200",
          isNavigating && "bg-background/18 backdrop-blur-[1.5px]",
        )}
      />
    </>
  )
}
