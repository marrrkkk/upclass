/**
 * Quality gate: warn the user when the model answers with uncertainty
 * despite having data-access tools available.
 */

const UNCERTAINTY_PATTERNS = [
  /i\s+(am|'m)\s+not\s+(entirely\s+|completely\s+)?sure/i,
  /i\s+(could\s+not|cannot|can'?t|was\s+unable\s+to)\s+(find|determine|verify|check)/i,
  /i\s+don'?t\s+have\s+(access\s+to|the\s+)/i,
  /i\s+do\s+not\s+have\s+(access\s+to|the\s+)/i,
  /(probably|maybe|perhaps|i\s+think)\s+(it\s+)?(might|may)\s+be/i,
]

export function getUncertaintyWarning(
  output: string,
  options: { toolsAvailable?: boolean } = {},
): string | null {
  if (!options.toolsAvailable) return null
  if (!output) return null

  for (const pattern of UNCERTAINTY_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(output)) {
      return "The answer may be incomplete — I had tools to look this up. Try rephrasing the question."
    }
  }

  return null
}