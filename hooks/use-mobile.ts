import { useMediaQuery } from "@/hooks/use-media-query"
import { breakpoints } from "@/lib/design-system"

/**
 * True below the `md` breakpoint (phones). Deterministic server fallback is
 * `false` (desktop), so interactive primitives that switch on this hook never
 * hydrate mismatched.
 */
export function useIsMobile() {
  return useMediaQuery(breakpoints.mobile)
}