"use client"

export type DraftQuestion = {
  id: string
  prompt: string
  type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
  points: number
  options: Array<{ id: string; text: string; isCorrect: boolean }>
}

export function createChoiceOptions() {
  return [
    { id: crypto.randomUUID(), text: "Option 1", isCorrect: true },
    { id: crypto.randomUUID(), text: "Option 2", isCorrect: false },
  ]
}

export function createTrueFalseOptions(correctAnswer: "true" | "false" = "true") {
  return [
    { id: crypto.randomUUID(), text: "True", isCorrect: correctAnswer === "true" },
    { id: crypto.randomUUID(), text: "False", isCorrect: correctAnswer === "false" },
  ]
}

export function createDraftQuestion(): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    type: "single_choice",
    points: 1,
    options: createChoiceOptions(),
  }
}

export function normalizeDraftQuestion(
  question: DraftQuestion,
  nextType: DraftQuestion["type"] = question.type,
): DraftQuestion {
  if (nextType === "short_answer") {
    return {
      ...question,
      type: nextType,
      options: [],
    }
  }

  if (nextType === "true_false") {
    const falseOption = question.options.find(
      (option) => option.isCorrect && option.text.trim().toLowerCase() === "false",
    )

    return {
      ...question,
      type: nextType,
      options: createTrueFalseOptions(falseOption ? "false" : "true"),
    }
  }

  const trimmedOptions = question.options
    .filter((option) => option.text.trim().length > 0)
    .map((option) => ({
      ...option,
      text: option.text.trim(),
    }))

  const nextOptions = trimmedOptions.length >= 2 ? trimmedOptions : createChoiceOptions()

  if (nextType === "single_choice") {
    const firstCorrectId = nextOptions.find((option) => option.isCorrect)?.id ?? nextOptions[0]?.id
    return {
      ...question,
      type: nextType,
      options: nextOptions.map((option) => ({
        ...option,
        isCorrect: option.id === firstCorrectId,
      })),
    }
  }

  return {
    ...question,
    type: nextType,
    options: nextOptions,
  }
}
