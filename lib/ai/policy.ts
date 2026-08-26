/**
 * Sensitivity-aware provider policy and feature kill switches.
 *
 * Every AI run is classified into one sensitivity class; each class has an
 * explicit model allowlist. A provider failure must NEVER route sensitive
 * data to a model outside its class's allowlist — the fallback chain is
 * filtered before any request is made.
 *
 * Kill switches are env-gated feature toggles for the pilot:
 *   AI_DISABLE_PULSE=1            Daily Class Pulse (facts + briefing)
 *   AI_DISABLE_RESOURCE_CHAT=1    Resource AI chat
 *   AI_DISABLE_QUIZ_GENERATION=1  Quiz generation
 *   AI_DISABLE_ACTIONS=1          AI action confirmation/execution
 *   AI_DISABLE_PROVIDERS=groq,openrouter  Exclude providers from routing
 *   AI_DISABLE_ACTION_TYPES=create_quiz,create_announcement  Per-type kill switch
 *   AI_DISABLE_LEARN_GENERATION=1 Study-space flashcard/quiz generation
 *   AI_DISABLE_RESOURCE_METADATA=1 AI metadata suggestions on upload
 *   AI_DISABLE_RESOURCE_SUMMARY=1 AI outline card on resource detail
 *   AI_DISABLE_SEMANTIC_SEARCH=1  Semantic resource search + related rail
 *   AI_DISABLE_GRADING_ASSIST=1   Draft feedback assist for teachers
 *   AI_DISABLE_GRADE_SUGGESTIONS=1 Short-answer grade suggestions
 *   AI_DISABLE_STUDY_PLAN=1       Weekly study plan generator
 *   AI_DISABLE_OUTREACH=1         At-risk outreach drafts
 */
import type { AiIntent, AiRunSurface, AiSensitivity } from "@/lib/ai/types"

export type AiRunRole = "teacher" | "student"

export type AiModelPolicy = {
  sensitivity: AiSensitivity
  allowedModels: string[]
  allowFallback: boolean
  maxOutputTokens?: number
}

/** Models trusted with each sensitivity class. Free-tier and lowest-quality
 * models are excluded from org-context and below. */
const SENSITIVITY_ALLOWLISTS: Record<AiSensitivity, string[]> = {
  public_class: [],
  org_context: [
    "cerebras:gpt-oss-120b",
    "cerebras:gpt-oss-20b",
    "groq:llama-3.3-70b-versatile",
    "google:gemini-2.5-flash",
    "google:gemini-2.5-flash-lite",
    "mistral:open-mistral-nemo",
  ],
  student_linked: [
    "cerebras:gpt-oss-120b",
    "groq:llama-3.3-70b-versatile",
    "google:gemini-2.5-flash",
    "mistral:open-mistral-nemo",
  ],
  highly_sensitive: ["cerebras:gpt-oss-120b", "google:gemini-2.5-flash"],
}

const SENSITIVITY_FALLBACK: Record<AiSensitivity, boolean> = {
  public_class: true,
  org_context: true,
  student_linked: true,
  highly_sensitive: false,
}

/**
 * Classify an AI run's sensitivity from its role, surface, and intent.
 * Student-linked data (grades, submissions, rosters, answer keys) and
 * student-visible runs are the boundary: teachers asking about analytics
 * are student_linked; student data queries are student_linked; pure org
 * context and general questions stay at org_context/public_class.
 */
export function classifySensitivity(params: {
  role: AiRunRole
  surface: AiRunSurface
  intent?: AiIntent
}): AiSensitivity {
  if (params.intent === "analytics") return "student_linked"

  if (params.surface === "class") {
    if (params.role === "student") return "student_linked"
    return "org_context"
  }

  if (params.surface === "dashboard") return "org_context"

  if (params.surface === "resource") return "org_context"
  if (params.surface === "quiz") return "org_context"
  if (params.surface === "pulse") return "student_linked"

  return "org_context"
}

/** Resolve the model policy for a sensitivity class. */
export function getModelPolicy(sensitivity: AiSensitivity): AiModelPolicy {
  return {
    sensitivity,
    allowedModels: SENSITIVITY_ALLOWLISTS[sensitivity],
    allowFallback: SENSITIVITY_FALLBACK[sensitivity],
  }
}

/** True when a model id is approved for the sensitivity class. */
export function isModelAllowedForSensitivity(
  modelId: string,
  sensitivity: AiSensitivity,
): boolean {
  const allowed = SENSITIVITY_ALLOWLISTS[sensitivity]
  if (allowed.length === 0) return true
  return allowed.includes(modelId)
}

/* -------------------------------------------------------------------------- */
/* Kill switches                                                               */
/* -------------------------------------------------------------------------- */

function envEnabled(flag: string): boolean {
  return !process.env[flag]
}

export const isPulseEnabled = (): boolean => envEnabled("AI_DISABLE_PULSE")
export const isResourceChatEnabled = (): boolean => envEnabled("AI_DISABLE_RESOURCE_CHAT")
export const isQuizGenerationEnabled = (): boolean => envEnabled("AI_DISABLE_QUIZ_GENERATION")
export const isAiActionsEnabled = (): boolean => envEnabled("AI_DISABLE_ACTIONS")
export const isLearnGenerationEnabled = (): boolean => envEnabled("AI_DISABLE_LEARN_GENERATION")
export const isResourceMetadataEnabled = (): boolean => envEnabled("AI_DISABLE_RESOURCE_METADATA")
export const isResourceSummaryEnabled = (): boolean => envEnabled("AI_DISABLE_RESOURCE_SUMMARY")
export const isSemanticSearchEnabled = (): boolean => envEnabled("AI_DISABLE_SEMANTIC_SEARCH")
export const isGradingAssistEnabled = (): boolean => envEnabled("AI_DISABLE_GRADING_ASSIST")
export const isGradeSuggestionsEnabled = (): boolean => envEnabled("AI_DISABLE_GRADE_SUGGESTIONS")
export const isStudyPlanEnabled = (): boolean => envEnabled("AI_DISABLE_STUDY_PLAN")
export const isOutreachEnabled = (): boolean => envEnabled("AI_DISABLE_OUTREACH")

/** Providers excluded by `AI_DISABLE_PROVIDERS` (comma-separated). */
export function getDisabledProviders(): string[] {
  const raw = process.env.AI_DISABLE_PROVIDERS ?? ""
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/** Action types excluded by `AI_DISABLE_ACTION_TYPES` (comma-separated). */
export function getDisabledActionTypes(): string[] {
  const raw = process.env.AI_DISABLE_ACTION_TYPES ?? ""
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function isActionTypeDisabled(action: string): boolean {
  return getDisabledActionTypes().includes(action)
}

export function isProviderDisabled(provider: string): boolean {
  return getDisabledProviders().includes(provider)
}