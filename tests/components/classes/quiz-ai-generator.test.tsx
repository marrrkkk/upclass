import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { QuizAiGenerator } from "@/components/classes/quiz-ai-generator"

const mocks = vi.hoisted(() => ({
  startUpload: vi.fn(),
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({ startUpload: mocks.startUpload, isUploading: false }),
}))

function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("QuizAiGenerator", () => {
  it("sends teacher instructions and applies the generated editable quiz", async () => {
    const user = userEvent.setup()
    const onGenerated = vi.fn()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        quiz: {
          title: "Plant science check",
          description: "A short assessment.",
          questions: [
            {
              prompt: "What process helps plants make food?",
              type: "single_choice",
              points: 1,
              options: [
                { text: "Photosynthesis", isCorrect: true },
                { text: "Respiration", isCorrect: false },
              ],
            },
          ],
        },
      }),
    } as Response)

    renderWithQueryClient(<QuizAiGenerator classId="class-1" onGenerated={onGenerated} />)

    await user.type(
      screen.getByLabelText(/Teacher instructions/),
      "Create a short formative assessment about photosynthesis.",
    )
    await user.click(screen.getByRole("button", { name: "Generate questions" }))

    await waitFor(() => expect(onGenerated).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/quizzes/generate",
      expect.objectContaining({ method: "POST" }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      classId: "class-1",
      instructions: "Create a short formative assessment about photosynthesis.",
      files: [],
    })
    expect(onGenerated).toHaveBeenCalledWith(expect.objectContaining({ title: "Plant science check" }))
    fetchMock.mockRestore()
  })
})
