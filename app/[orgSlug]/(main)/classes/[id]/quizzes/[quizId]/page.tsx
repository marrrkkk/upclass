import { Suspense } from "react"

import { QuizTakingSkeleton } from "@/components/skeletons"
import { QuizTakingData } from "./quiz-taking-data"

export default function StudentQuizPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string; quizId: string }>
}) {
  return (
    <Suspense fallback={<QuizTakingSkeleton />}>
      <QuizTakingData params={params} />
    </Suspense>
  )
}