/** Small, display-only slice of a class member used by avatar stacks. */
export type ClassMemberPreview = {
  id: string
  name: string | null
  image: string | null
}

export type ClassCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  gradeLevel: string | null
  customGrade: string | null
  section: string | null
  color: string | null
  schedule: string | null
  createdAt: string
  enrolledCount: number
  role: "teaching" | "enrolled"
  teacherName: string | null
  teacherImage: string | null
  /**
   * Last time the class record itself changed. Optional because offline cache
   * entries written by earlier versions do not carry it.
   */
  updatedAt?: string
  /** Classwork items posted in the class. Optional for cached entries. */
  classworkCount?: number
  /**
   * First few enrolled students, oldest first, for the card avatar stack.
   * `enrolledCount` stays the source of truth for the total.
   */
  students?: ClassMemberPreview[]
}


export type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  gradeLevel: string | null
  customGrade: string | null
  section: string | null
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

/** One entry in a teacher's "needs grading" review queue. */
export type ClassRailQueueItem = {
  id: string
  kind: "classwork" | "quiz"
  /** Classwork or quiz id the item belongs to. */
  itemId: string
  title: string
  studentId: string
  studentName: string
  submittedAt: string | null
}

/** One row in a student's personal grade summary. */
export type ClassRailGrade = {
  id: string
  kind: "classwork" | "quiz"
  title: string
  grade: string | null
  total: string | null
  status: "graded" | "submitted" | "draft" | "pending_review"
  updatedAt: string | null
}

/** One upcoming, not-yet-completed item for a student. */
export type ClassRailDueItem = {
  id: string
  kind: "classwork" | "quiz"
  title: string
  dueDate: string
}

/**
 * Role-scoped slice backing the class detail side rail. Server-queried once per
 * class page and cached with the rest of the class detail for offline reads.
 */
export type ClassRailData = {
  /** Teacher: queue of ungraded submissions and pending quiz reviews. */
  needsGrading: ClassRailQueueItem[]
  /** Teacher: total counts behind the queue. */
  gradingCounts: {
    classwork: number
    quizzes: number
  }
  /** Student: own grades across classwork and quizzes. */
  myGrades: ClassRailGrade[]
  /** Student: classwork/quizzes still due, soonest first. */
  upcomingDue: ClassRailDueItem[]
  /** Student: nearest upcoming due date, used by the hero chip. */
  nextDue: string | null
}

/** A column in the gradebook matrix: one classwork item or published quiz. */
export type GradebookItem = {
  id: string
  kind: "classwork" | "quiz"
  title: string
  dueDate: string | null
  points: string | null
}

/** One cell in the gradebook matrix for a given student + item. */
export type GradebookCell = {
  itemId: string
  score: string | null
  status: "unsubmitted" | "submitted" | "draft" | "pending_review" | "graded"
  submissionId: string | null
  attemptId: string | null
}

/** One row in the gradebook matrix: a single student across all items. */
export type GradebookRow = {
  studentId: string
  studentName: string
  studentImage: string | null
  cells: GradebookCell[]
  average: string | null
}
