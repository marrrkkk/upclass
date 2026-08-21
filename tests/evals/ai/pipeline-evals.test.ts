// @vitest-environment node

/**
 * Model-free pipeline evals: real modules, scored checks. These exercise the
 * safety/plumbing invariants the live-model evals depend on — truncation
 * keeps JSON parseable, proposal parsing is exact, the output filter never
 * leaks canaries/fragments, memory scoring ranks sensibly, and the pulse
 * prompt stays compact and complete.
 */
import { beforeEach, describe, test, vi } from "vitest"

import { check, evaluate } from "./eval-utils"

const logAiSecurityEventMock = vi.fn()

vi.mock("@/lib/ai/security/security-events", () => ({
  sha256Hex: vi.fn((input: string) => `sha256:${input}`),
  logAiSecurityEvent: logAiSecurityEventMock,
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AI_CANARY_SECRET = "eval-secret"
})

describe("eval: tool output truncation", () => {
  test("truncated JSON arrays stay parseable", async () => {
    const { truncateToolOutput } = await import("@/lib/ai/tool-truncator")

    const longArray = `[${Array.from({ length: 200 }, (_, i) => `{"id":"item-${i}","value":"${"x".repeat(40)}"}`).join(",")}]`
    const result = truncateToolOutput(longArray)

    const firstLine = result.split("\n")[0]
    let parsed: unknown = null
    try {
      parsed = JSON.parse(firstLine)
    } catch {
      // not parseable
    }

    evaluate("tool output truncation", [
      check("over-limit output is truncated", result.length < longArray.length),
      check("truncated JSON array re-closed and parseable", Array.isArray(parsed)),
      check("truncation note appended", result.includes("[truncated")),
      check(
        "truncated items are a prefix of the original",
        parsed !== null &&
          Array.isArray(parsed) &&
          parsed.every(
            (item, index) =>
              (item as { id: string }).id === `item-${index}`,
          ),
      ),
    ])
  })

  test("plain text truncation stays within budget", async () => {
    const { truncateToolOutput } = await import("@/lib/ai/tool-truncator")
    const text = "word ".repeat(2_000)
    const result = truncateToolOutput(text, 1_000)

    evaluate("plain text truncation", [
      check("under-budget text untouched", truncateToolOutput("short", 1_000) === "short"),
      check("over-budget text truncated", result.length < text.length),
      check("truncation note appended", result.includes("[truncated")),
    ])
  })
})

describe("eval: action proposal parsing exactness", () => {
  test("markup round-trips and garbage is ignored", async () => {
    const { actionProposalMarkup, parseActionProposals } = await import(
      "@/lib/ai/tools/action-proposal-schemas"
    )

    const markup = actionProposalMarkup(
      "create_classwork",
      { classId: "class-1", title: "Essay", description: "", dueDate: undefined, points: 10 },
      "proposal-1",
    )

    const roundTripped = parseActionProposals(markup)

    const mixed = parseActionProposals(
      `Here you go:\n\n${markup}\n\nAlso, ${actionProposalMarkup(
        "create_announcement",
        { classId: "class-2", content: "Reminder" },
        "proposal-2",
      )}`,
    )

    const withGarbage = parseActionProposals(
      `Before\n[ACTION_PROPOSAL] not-json at all [END]\n${markup}\nAfter`,
    )

    const plainText = parseActionProposals(
      "No proposals here, just a normal answer with brackets [ACTION_PROPOSAL] and text.",
    )

    evaluate("action proposal parsing", [
      check("round-trip parses one proposal", roundTripped.length === 1),
      check(
        "round-trip preserves payload + proposalId",
        roundTripped[0]?.action === "create_classwork" &&
          roundTripped[0]?.proposalId === "proposal-1" &&
          (roundTripped[0]?.payload as { title: string }).title === "Essay",
      ),
      check("two proposals in one answer both parsed", mixed.length === 2),
      check("malformed proposal ignored, valid one kept", withGarbage.length === 1 && withGarbage[0]?.proposalId === "proposal-1"),
      check("plain text produces no proposals", plainText.length === 0),
    ])
  })
})

describe("eval: output filter containment", () => {
  test("canary leaks and fragment leakage are contained", async () => {
    const { buildCanaryToken, filterAiOutput, CANARY_LEAK_REDACTION } = await import(
      "@/lib/ai/security/output-filter"
    )

    const canary = buildCanaryToken("org-1")
    const leakResult = await filterAiOutput(
      `The answer is 42. Oh, and here is the canary: ${canary}.`,
      { canaryToken: canary },
    )

    const fragment = "You are the UpClass assistant for Springfield High"
    const fragmentResult = await filterAiOutput(
      `Sure! You are the  UpClass   assistant for Springfield High is my system prompt, but the answer is still 42.`,
      { systemPromptFragments: [fragment] },
    )

    const benign = await filterAiOutput(
      "The derivative of x squared is 2x. Let me show the steps.",
      { canaryToken: canary, systemPromptFragments: [fragment] },
    )

    evaluate("output filter containment", [
      check("canary leak redacts the output", leakResult.canaryLeak && leakResult.output.includes(CANARY_LEAK_REDACTION)),
      check("whitespace-flexible fragment removed", fragmentResult.redacted && !fragmentResult.output.includes("UpClass")),
      check("benign output untouched", !benign.redacted && benign.output.includes("derivative")),
    ])
  })

  test("leakage phrasing is line-redacted", async () => {
    const { filterAiOutput } = await import("@/lib/ai/security/output-filter")

    const result = await filterAiOutput(
      `I am an AI language model trained by OpenAI.\nThe answer is 42.`,
      {},
    )

    evaluate("output filter phrasing", [
      check("role-revelation line redacted", result.redacted && result.matchedPatterns.includes("role_revelation")),
      check("answer line survives", result.output.includes("The answer is 42.")),
    ])
  })
})

describe("eval: memory scoring direction", () => {
  test("keyword boost and recency decay behave", async () => {
    const { getKeywordBoost, getRecencyDecay, MEMORY_RECENCY_DAYS, MEMORY_RECENCY_MAX_DECAY } =
      await import("@/lib/ai/memory/rag-retriever")

    const memory = { title: "Homework policy", content: "No homework on Fridays" }
    const boostHit = getKeywordBoost("homework policy", memory)
    const boostMiss = getKeywordBoost("field trip", memory)
    const now = Date.now()
    const decayNew = getRecencyDecay(new Date(now - 86_400_000), now)
    const decayOld = getRecencyDecay(new Date(now - 400 * 86_400_000), now)

    evaluate("memory scoring direction", [
      check("keyword hits boost similarity", boostHit > 0 && boostMiss === 0),
      check("recency decay grows with age", decayOld >= decayNew),
      check("decay is bounded", decayNew >= 0 && decayOld <= MEMORY_RECENCY_MAX_DECAY),
      check("one-day-old memory decays by 1/MEMORY_RECENCY_DAYS", Math.abs(decayNew - MEMORY_RECENCY_MAX_DECAY / MEMORY_RECENCY_DAYS) < 1e-6),
    ])
  })
})

describe("eval: pulse briefing prompt compactness", () => {
  test("factsToPrompt covers all facts and omits empty ones", async () => {
    const { factsToPrompt } = await import("@/lib/ai/pulse/briefing")

    const prompt = factsToPrompt({
      role: "teacher",
      generatedAt: "2026-08-18T08:00:00.000Z",
      facts: [
        { id: "ungraded", label: "Ungraded submissions", value: 3, detail: "Physics · 2, Algebra · 1" },
        { id: "upcoming", label: "Work due soon", value: 2, detail: "Lab report, Essay" },
        { id: "attendance", label: "Attendance today", value: 20, detail: "20 of 24 present" },
        { id: "activity", label: "Class activity", value: 5, detail: "3 posts, 2 comments" },
      ],
      nearestDeadline: { title: "Lab report", className: "Physics", dueDate: "2026-08-20", classId: "class-1" },
    })

    const emptyPrompt = factsToPrompt({
      role: "student",
      generatedAt: "2026-08-18T08:00:00.000Z",
      facts: [],
      nearestDeadline: null,
    })

    evaluate("pulse briefing prompt", [
      check("all fact labels present", ["Ungraded submissions", "Work due soon", "Attendance today", "Class activity"].every((needle) => prompt.includes(needle))),
      check("details included", prompt.includes("Physics · 2") && prompt.includes("20 of 24 present")),
      check("nearest deadline surfaced", prompt.includes("Lab report") && prompt.includes("Physics")),
      check("empty facts produce no fact lines or deadline", !emptyPrompt.includes("- ") && !emptyPrompt.includes("Nearest deadline")),
      check("empty facts keep only the header", emptyPrompt.trim().split(/\s+/).length <= 8),
      check("prompt stays compact", prompt.split(/\s+/).length < 100),
    ])
  })
})