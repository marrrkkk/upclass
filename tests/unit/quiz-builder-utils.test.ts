import {
  createChoiceOptions,
  createDraftQuestion,
  createTrueFalseOptions,
  normalizeDraftQuestion,
  type DraftQuestion,
} from "@/components/classes/quiz-builder-utils"

describe("quiz-builder-utils", () => {
  let uuidCounter = 0

  beforeEach(() => {
    uuidCounter = 0
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => `uuid-${++uuidCounter}`)
  })

  it("creates default choice options with one correct answer", () => {
    expect(createChoiceOptions()).toEqual([
      { id: "uuid-1", text: "Option 1", isCorrect: true },
      { id: "uuid-2", text: "Option 2", isCorrect: false },
    ])
  })

  it("creates true/false options for both valid answers", () => {
    expect(createTrueFalseOptions()).toEqual([
      { id: "uuid-1", text: "True", isCorrect: true },
      { id: "uuid-2", text: "False", isCorrect: false },
    ])

    expect(createTrueFalseOptions("false")).toEqual([
      { id: "uuid-3", text: "True", isCorrect: false },
      { id: "uuid-4", text: "False", isCorrect: true },
    ])
  })

  it("creates a default draft question", () => {
    expect(createDraftQuestion()).toEqual({
      id: "uuid-1",
      prompt: "",
      type: "single_choice",
      points: 1,
      options: [
        { id: "uuid-2", text: "Option 1", isCorrect: true },
        { id: "uuid-3", text: "Option 2", isCorrect: false },
      ],
    })
  })

  it("normalizes short answer questions by clearing options", () => {
    const question = createQuestion()

    expect(normalizeDraftQuestion(question, "short_answer")).toEqual({
      ...question,
      type: "short_answer",
      options: [],
    })
  })

  it("normalizes true false questions using the existing false answer when present", () => {
    const question = createQuestion({
      options: [
        { id: "a", text: "False", isCorrect: true },
        { id: "b", text: "True", isCorrect: false },
      ],
    })

    expect(normalizeDraftQuestion(question, "true_false")).toEqual({
      ...question,
      type: "true_false",
      options: [
        { id: "uuid-1", text: "True", isCorrect: false },
        { id: "uuid-2", text: "False", isCorrect: true },
      ],
    })
  })

  it("trims options and enforces a single correct answer for single choice questions", () => {
    const question = createQuestion({
      type: "multiple_select",
      options: [
        { id: "a", text: "  First option  ", isCorrect: false },
        { id: "b", text: " Second option ", isCorrect: true },
        { id: "c", text: " Third option ", isCorrect: true },
      ],
    })

    expect(normalizeDraftQuestion(question, "single_choice")).toEqual({
      ...question,
      type: "single_choice",
      options: [
        { id: "a", text: "First option", isCorrect: false },
        { id: "b", text: "Second option", isCorrect: true },
        { id: "c", text: "Third option", isCorrect: false },
      ],
    })
  })

  it("replaces invalid option sets with fresh defaults", () => {
    const question = createQuestion({
      options: [
        { id: "a", text: "   ", isCorrect: false },
        { id: "b", text: "", isCorrect: false },
      ],
    })

    expect(normalizeDraftQuestion(question, "multiple_select")).toEqual({
      ...question,
      type: "multiple_select",
      options: [
        { id: "uuid-1", text: "Option 1", isCorrect: true },
        { id: "uuid-2", text: "Option 2", isCorrect: false },
      ],
    })
  })
})

function createQuestion(overrides: Partial<DraftQuestion> = {}): DraftQuestion {
  return {
    id: "question-1",
    prompt: "Question?",
    type: "single_choice",
    points: 1,
    options: [
      { id: "opt-1", text: "Option 1", isCorrect: true },
      { id: "opt-2", text: "Option 2", isCorrect: false },
    ],
    ...overrides,
  }
}
