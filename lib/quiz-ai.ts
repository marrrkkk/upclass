export type AiGeneratedQuizQuestion = {
  prompt: string
  type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
  points: number
  options: Array<{ text: string; isCorrect: boolean }>
}

export type AiGeneratedQuiz = {
  title: string
  description: string
  questions: AiGeneratedQuizQuestion[]
}
