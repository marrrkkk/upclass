/**
 * Tool selector: intent-filtered tool lists.
 *
 * Read tools come from the metadata (category/intent match). Action tools
 * are only offered to teachers/owners and only for action intents.
 */
import {
  READ_TOOL_METADATA,
  ACTION_TOOL_METADATA,
  STRUCTURED_TOOL_NAMES,
  getActiveToolCategories,
} from "@/lib/ai/tools/tool-metadata"
import type { AiIntent } from "@/lib/ai/types"

export const MAX_READ_TOOLS_PER_TURN = 6
export const MAX_ACTION_TOOLS_PER_TURN = 4

const INTENT_READ_CAPS: Partial<Record<AiIntent, number>> = {
  analytics: 4,
  memory_recall: 2,
  general_question: 4,
}

export function selectToolNames(params: {
  intent: AiIntent
  role: "teacher" | "student"
  forceToolNames?: string[]
}): string[] {
  const categories = getActiveToolCategories(params.intent)
  const isQueryTurn = categories.includes("query")
  const isActionTurn = categories.includes("action")

  let readNames: string[] = []
  if (isQueryTurn) {
    readNames = READ_TOOL_METADATA.filter(
      (tool) => tool.intents.includes(params.intent) || categories.includes(tool.category),
    ).map((tool) => tool.name)

    const cap = INTENT_READ_CAPS[params.intent] ?? MAX_READ_TOOLS_PER_TURN
    readNames = readNames.slice(0, cap)
  }

  let actionNames: string[] = []
  if (isActionTurn && params.role === "teacher") {
    actionNames = ACTION_TOOL_METADATA.filter(
      (tool) => tool.intents.includes(params.intent) || categories.includes(tool.category),
    ).map((tool) => tool.name)
    actionNames = actionNames.slice(0, MAX_ACTION_TOOLS_PER_TURN)
  }

  const selected = [...readNames, ...actionNames]

  if (params.forceToolNames && params.forceToolNames.length > 0) {
    const forced = params.forceToolNames.filter(
      (name) =>
        READ_TOOL_METADATA.some((tool) => tool.name === name) ||
        ACTION_TOOL_METADATA.some((tool) => tool.name === name),
    )
    for (const name of forced) {
      if (!selected.includes(name)) selected.push(name)
    }
  }

  return [...new Set(selected)]
}

export function isStructuredToolName(name: string): boolean {
  return STRUCTURED_TOOL_NAMES.has(name)
}