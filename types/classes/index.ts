export type ClassCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  schedule: string | null
  createdAt: string
  enrolledCount: number
  role: "teaching" | "enrolled"
  teacherName: string | null
  teacherImage: string | null
}

export type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  code: string
  color: string
  schedule: string | null
}

export type AnnouncementReaction = {
  userId: string
  reaction: string
}

export type AnnouncementData = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    image: string | null
  }
  reactions: AnnouncementReaction[]
}

export type ClassworkData = {
  id: string
  title: string
  description: string | null
  type: string
  dueDate: string | null
  points: string | null
  createdAt: string
}

export type SubmissionData = {
  id: string
  classworkId: string
  studentId: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  status: string
  grade: string | null
  feedback: string | null
  submittedAt: string | null
  gradedAt: string | null
  attachments: SubmissionAttachmentData[]
  revisions: SubmissionRevisionData[]
  gradingHistory: SubmissionGradeHistoryData[]
  student: {
    id: string
    name: string
    image: string | null
  }
}

export type SubmissionAttachmentData = {
  id: string
  submissionId: string
  fileUrl: string
  fileName: string
  fileType: string | null
  fileSize: string | null
  createdAt: string
}

export type SubmissionRevisionData = {
  id: string
  submissionId: string
  revisionNumber: number
  action: string
  content: string | null
  status: string
  submittedAt: string | null
  createdAt: string
}

export type SubmissionGradeHistoryData = {
  id: string
  submissionId: string
  grade: string
  feedback: string | null
  createdAt: string
}

export type QuizOption = {
  id: string
  questionId: string
  text: string
  isCorrect: boolean
}

export type QuizQuestion = {
  id: string
  quizId: string
  prompt: string
  type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
  points: string
  order: string
  options: QuizOption[]
}

export type QuizAttempt = {
  id: string
  quizId: string
  studentId: string
  status: "pending_review" | "graded"
  score: string | null
  startedAt?: string
  submittedAt: string | null
  gradedAt: string | null
  timeSpentSeconds: string | null
  createdAt?: string
  student?: {
    id: string
    name: string
    image: string | null
  }
}

export type QuizAnswer = {
  id: string
  attemptId: string
  questionId: string
  selectedOptionIds: string | null
  textAnswer: string | null
  isCorrect: boolean | null
  pointsAwarded: string | null
}

export type QuizData = {
  id: string
  classId: string
  title: string
  description: string | null
  status: "draft" | "published"
  dueDate: string | null
  timeLimitSeconds: string | null
  totalPoints: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  questions: QuizQuestion[]
  attempt: QuizAttempt | null
  answers: QuizAnswer[]
  attempts: QuizAttempt[]
}

export type MemberData = {
  id: string
  name: string
  email: string
  image: string | null
  role: "teacher" | "student"
}
