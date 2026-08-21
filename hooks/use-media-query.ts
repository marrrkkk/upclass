"use client"

import * as React from "react"

/**
 * SSR-safe `matchMedia` subscription.
 *
 * - Server and the first client render both report `initialValue`
 *   (default `false`), so markup never hydrates with mismatched state.
 * - Subscribes to media changes after mount and keeps the value in sync.
 * - Returns a plain boolean — no layout, only interaction decisions.
 *
 * Do not use this for layout that CSS breakpoints can handle. Reach for it
 * only when the rendered interaction primitive must change, such as swapping
 * a Dialog for a Sheet, or switching a master/detail view.
 */
export function useMediaQuery(query: string, initialValue = false): boolean {
  const [matches, setMatches] = React.useState(initialValue)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)

    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [query])

  return matches
}