// @vitest-environment node

import { describe, expect, test } from "vitest"

import {
  actionProposalMarkup,
  normalizeDueDate,
  normalizeGeneratedQuiz,
  parseActionProposals,
} from "@/lib/ai/tools/action-proposal-schemas"

describe("parseActionProposals", () => {
  test("extracts proposals from markup", () => {
    const text =
      "I can do that.\n" +
      actionProposalMarkup("create_announcement", { classId: "c1", content: "Hello" }) +
      "\nAnything else?"
    const proposals = parseActionProposals(text)
    expect(proposals).toHaveLength(1)
    expect(proposals[0].action).toBe("create_announcement")
    expect(proposals[0].payload).toEqual({ classId: "c1", content: "Hello" })
  })

  test("extracts multiple proposals", () => {
    const text =
      actionProposalMarkup("create_classwork", { classId: "c1", title: "HW1" }) +
      actionProposalMarkup("create_channel_message", { channelId: "ch1", content: "Hi" })
    const proposals = parseActionProposals(text)
    expect(proposals.map((p) => p.action)).toEqual([
      "create_classwork",
      "create_channel_message",
    ])
  })

  test("ignores malformed and empty proposals", () => {
    const text =
      "[ACTION_PROPOSAL]{not json[/ACTION_PROPOSAL]" +
      "[ACTION_PROPOSAL]{\"action\":\"create_quiz\"}[/ACTION_PROPOSAL]" +
      "[ACTION_PROPOSAL][/ACTION_PROPOSAL]"
    expect(parseActionProposals(text)).toEqual([])
  })

  test("round-trips through actionProposalMarkup", () => {
    const payload = { classId: "c1", title: "A", dueDate: "2026-08-20T15:00:00.000Z", points: 10 }
    const parsed = parseActionProposals(actionProposalMarkup("create_classwork", payload))
    expect(parsed[0].payload).toEqual(payload)
  })
})

describe("normalizeDueDate", () => {
  test("accepts ISO strings and normalizes to date", () => {
    expect(normalizeDueDate("2026-08-20T15:00:00.000Z")).toBe("2026-08-20")
  })

  test("rejects empty and nonsense values", () => {
    expect(normalizeDueDate(undefined)).toBeUndefined()
    expect(normalizeDueDate("")).toBeUndefined()
    expect(normalizeDueDate("tomorrowish")).toBeUndefined()
  })
})

describe("normalizeGeneratedQuiz", () => {
  test("normalizes a generated quiz", () => {
    const quiz = normalizeGeneratedQuiz({
      title: "Quiz 1",
      description: "",
      questions: [
        {
          prompt: "What is 2+2?",
          type: "single_choice",
          points: 5,
          options: [
            { text: "3", isCorrect: false },
            { text: "4", isCorrect: true },
          ],
        },
      ],
    })
    expect(quiz.title).toBe("Quiz 1")
    expect(quiz.questions).toHaveLength(1)
    const question = quiz.questions[0]
    expect(question.options).toEqual([
      { text: "3", isCorrect: false },
      { text: "4", isCorrect: true },
    ])
  })
})