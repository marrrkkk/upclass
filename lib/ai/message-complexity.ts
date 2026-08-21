/**
 * Simple vs complex message classification for context and history budgets.
 */

const GENERATION_VERBS = /\b(create|make|generate|draft|write|build|prepare|schedule|grade|summarize|summarise|review|plan|organize|organise)\b/i
const ANALYSIS_PATTERNS = /\b(analy[sz]e|compare|explain|detail|evaluate|trend|average|distribution|performance|progress|stats?|summary)\b/i
const QUESTION_MARKS = /\?/g

export type MessageComplexity = "simple" | "complex"

export function classifyMessageComplexity(message: string): MessageComplexity {
  const text = message.trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 5 && !GENERATION_VERBS.test(text)) {
    return "simple"
  }

  if (GENERATION_VERBS.test(text) || ANALYSIS_PATTERNS.test(text)) {
    return "complex"
  }

  const questionMarks = text.match(QUESTION_MARKS)?.length ?? 0
  if (questionMarks >= 2 || words.length > 30) {
    return "complex"
  }

  return "simple"
}

export type ContextBudgets = {
  contextChars: number
  historyLimit: number
}

/** Context/history budgets per complexity and surface. */
export function getContextBudgets(
  complexity: MessageComplexity,
  surface: "dashboard" | "class",
): ContextBudgets {
  if (complexity === "simple") {
    return surface === "class"
      ? { contextChars: 6_000, historyLimit: 6 }
      : { contextChars: 6_000, historyLimit: 4 }
  }

  return surface === "class"
    ? { contextChars: 16_000, historyLimit: 20 }
    : { contextChars: 16_000, historyLimit: 10 }
}