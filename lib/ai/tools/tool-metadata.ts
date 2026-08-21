/**
 * Tool metadata: category + intent triggers driving intent-filtered selection.
 */
import type { AiIntent } from "@/lib/ai/types"

export type AiToolCategory = "query" | "action"

export type AiToolMetadata = {
  name: string
  category: AiToolCategory
  intents: AiIntent[]
  structured?: boolean
  description: string
}

export const TOOL_CATEGORY_INTENTS: Record<AiToolCategory, AiIntent[]> = {
  query: ["data_query", "analytics", "memory_recall"],
  action: ["classwork_action", "quiz_action", "workflow_guidance"],
}

/** Both tool categories are active for general questions. */
export function getActiveToolCategories(intent: AiIntent): AiToolCategory[] {
  if (intent === "general_question") return ["query", "action"]
  return (Object.keys(TOOL_CATEGORY_INTENTS) as AiToolCategory[]).filter((category) =>
    TOOL_CATEGORY_INTENTS[category].includes(intent),
  )
}

export const READ_TOOL_METADATA: AiToolMetadata[] = [
  {
    name: "get_org_stats",
    category: "query",
    intents: ["data_query", "analytics"],
    description:
      "Returns aggregate counts for the organization: classes, members, classwork items, quizzes, announcements, and the user's own uploaded resources.",
  },
  {
    name: "get_recent_activity",
    category: "query",
    intents: ["data_query", "analytics"],
    description:
      "Returns the most recent activity log entries across the organization's classes, newest first.",
  },
  {
    name: "search_classes",
    category: "query",
    intents: ["data_query"],
    description: "Searches classes the user belongs to by title, code, or category.",
  },
  {
    name: "unified_search",
    category: "query",
    intents: ["data_query", "general_question"],
    description:
      "Searches across multiple content types (classes, classwork, resources, announcements) with a single query. Use when the user asks a broad question without specifying the content type.",
  },
  {
    name: "list_classes",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description: "Lists the classes the user belongs to within the organization.",
  },
  {
    name: "get_class_details",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description:
      "Returns details for one class: title, code, category, description, schedule, member count and teachers.",
  },
  {
    name: "get_class_roster",
    category: "query",
    intents: ["data_query"],
    description:
      "Lists the members of a class with their roles. Emails are only included for teachers and owners.",
  },
  {
    name: "get_class_schedule",
    category: "query",
    intents: ["data_query"],
    description: "Returns the schedule string for a class, if one is set.",
  },
  {
    name: "list_classwork",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description:
      "Lists classwork (assignments, quizzes, materials) in a class, newest first, with due dates and points.",
  },
  {
    name: "get_classwork_details",
    category: "query",
    intents: ["data_query"],
    description:
      "Returns details for one classwork item. Teachers see submission counts; students see their own submission status.",
  },
  {
    name: "get_ungraded_submissions",
    category: "query",
    intents: ["data_query", "analytics"],
    description:
      "Lists recently submitted, ungraded student submissions across the classes the user teaches. Teachers and owners only.",
  },
  {
    name: "get_submission_details",
    category: "query",
    intents: ["data_query"],
    description:
      "Returns one submission: student, status, grade, feedback, and content. Students can only view their own submissions.",
  },
  {
    name: "list_quizzes",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description:
      "Lists quizzes in a class (optionally filtered by draft/published status), newest first, with due dates and total points.",
  },
  {
    name: "get_quiz_details",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description:
      "Returns details for one quiz including questions. Correct-answer flags are only exposed to teachers and owners.",
  },
  {
    name: "get_quiz_results",
    category: "query",
    intents: ["data_query", "analytics"],
    description:
      "Returns quiz attempt results. Teachers and owners see all students; students only see their own attempts.",
  },
  {
    name: "get_student_overview",
    category: "query",
    intents: ["data_query", "analytics"],
    structured: true,
    description:
      "Returns a performance overview for a student in a class: submission count, graded count, quiz attempts, and average grade. Teachers and owners may pass studentId.",
  },
  {
    name: "list_resources",
    category: "query",
    intents: ["data_query"],
    structured: true,
    description: "Lists the user's own uploaded resources, newest first.",
  },
  {
    name: "get_resource_details",
    category: "query",
    intents: ["data_query"],
    description:
      "Returns one of the user's resources including a preview of its extracted source text.",
  },
  {
    name: "search_resources",
    category: "query",
    intents: ["data_query"],
    description: "Searches the user's own resources by title or description.",
  },
  {
    name: "search_resource_content",
    category: "query",
    intents: ["data_query", "general_question"],
    description:
      "Searches within the extracted text content of a specific resource. Use when the user asks about specific information within a resource document.",
  },
  {
    name: "get_upcoming_work",
    category: "query",
    intents: ["data_query", "analytics"],
    structured: true,
    description:
      "Returns upcoming assignments and quizzes with due dates, optionally filtered by class. Includes deadline prioritization and overdue items.",
  },
  {
    name: "get_study_summary",
    category: "query",
    intents: ["data_query", "analytics"],
    description:
      "Generates a study/planning summary for a class or across all classes. Includes recent classwork, upcoming deadlines, and focus areas.",
  },
  {
    name: "get_recent_context",
    category: "query",
    intents: ["memory_recall", "data_query"],
    description:
      "Retrieves recent activity context (announcements, messages, classwork) from the last N hours, optionally filtered by class. Useful for catch-up questions.",
  },
  {
    name: "get_announcements",
    category: "query",
    intents: ["data_query"],
    description: "Returns the most recent announcements in a class, newest first.",
  },
  {
    name: "get_channel_messages",
    category: "query",
    intents: ["data_query"],
    description: "Returns the most recent messages in a class channel, oldest first.",
  },
  {
    name: "get_org_knowledge",
    category: "query",
    intents: ["memory_recall", "data_query"],
    description:
      "Retrieves entries from the organization's knowledge base (teaching rules, subject knowledge, class context, workflow preferences) relevant to a query.",
  },
]

export const ACTION_TOOL_METADATA: AiToolMetadata[] = [
  {
    name: "draft_announcement",
    category: "action",
    intents: ["workflow_guidance", "classwork_action"],
    description:
      "Drafts a class announcement the teacher can publish. " +
      "The tool output renders as an interactive confirmation card — do not write any [ACTION_PROPOSAL] text manually.",
  },
  {
    name: "create_assignment",
    category: "action",
    intents: ["classwork_action"],
    description:
      "Drafts a class assignment the teacher can publish. " +
      "The tool output renders as an interactive confirmation card — do not write any [ACTION_PROPOSAL] text manually.",
  },
  {
    name: "draft_quiz",
    category: "action",
    intents: ["quiz_action"],
    description:
      "Drafts a quiz the teacher can publish. " +
      "The tool output renders as an interactive confirmation card — do not write any [ACTION_PROPOSAL] text manually.",
  },
  {
    name: "post_class_message",
    category: "action",
    intents: ["workflow_guidance"],
    description:
      "Posts a message to a class channel the teacher can confirm. " +
      "The tool output renders as an interactive confirmation card — do not write any [ACTION_PROPOSAL] text manually.",
  },
]

export const ALL_TOOL_METADATA: AiToolMetadata[] = [...READ_TOOL_METADATA, ...ACTION_TOOL_METADATA]

export function getToolNamesForIntents(intent: AiIntent): string[] {
  const categories = getActiveToolCategories(intent)
  return ALL_TOOL_METADATA.filter(
    (tool) =>
      categories.includes(tool.category) ||
      tool.intents.includes(intent),
  ).map((tool) => tool.name)
}

export const STRUCTURED_TOOL_NAMES = new Set(
  READ_TOOL_METADATA.filter((tool) => tool.structured).map((tool) => tool.name),
)