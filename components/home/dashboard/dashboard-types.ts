import type { ActivityLogItem } from "@/lib/activity-ui"
import type { PulseFacts } from "@/lib/ai/pulse/facts"

export type DashboardRole = "admin" | "teacher" | "student"

// ============================================================================
// Shared types
// ============================================================================

export type DashboardHeaderModel = {
  title: string
  subtitle: string
  dateLabel: string
  primaryAction: {
    label: string
    href: string
  }
}

export type DashboardClassItem = {
  id: string
  title: string
  description?: string | null
  color: string | null
  category?: string | null
  memberCount: number
  role: "teacher" | "student"
  nextDueItem?: {
    title: string
    dueDate: Date
  } | null
}

export type ActivityLogPreview = {
  items: ActivityLogItem[]
}

// ============================================================================
// Admin-specific types
// ============================================================================

export type AdminOperationsModel = {
  membersCount: number
  classesCount: number
  pendingInvitationsCount: number
  statusMessage: string
}

export type AdminAttentionItem =
  | {
      kind: "pending_invitation"
      id: string
      email: string
      role: string
      invitedAt: string
    }
  | {
      kind: "recent_class"
      id: string
      title: string
      color: string | null
      createdAt: string
      memberCount: number
    }
  | {
      kind: "recent_membership"
      id: string
      userName: string
      role: string
      classTitle: string
      joinedAt: string
    }

export type AdminWorkspaceModel = {
  shortcuts: Array<{
    label: string
    href: string
    icon: string
  }>
}

export type AdminDashboardViewModel = {
  role: "admin"
  header: DashboardHeaderModel
  operations: AdminOperationsModel
  attention: AdminAttentionItem[]
  workspace: AdminWorkspaceModel
  activity: ActivityLogPreview
  orgSlug: string
}

// ============================================================================
// Teacher-specific types
// ============================================================================

export type TeacherQueueItem =
  | {
      kind: "submission"
      id: string
      submissionId: string
      classworkId: string
      classworkTitle: string
      studentName: string
      classId: string
      className: string
      classColor: string | null
      submittedAt: string | null
      attachmentCount: number
    }
  | {
      kind: "question"
      id: string
      count: number
      title: string
    }
  | {
      kind: "overdue_alert"
      id: string
      count: number
      title: string
    }

export type TeacherMetric = {
  label: string
  value: number
  visible: boolean
}

export type TeacherCheckInItem = {
  userId: string
  studentName: string
  classId: string
  className: string
  lastActiveAt: string | null
}

export type DashboardDeadline = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  dueDate: Date
  classId: string
  className: string
  classColor: string | null
  points?: string | null
  submissionCount?: number
  totalStudents?: number
}

export type TeacherDashboardViewModel = {
  role: "teacher"
  header: DashboardHeaderModel
  queue: TeacherQueueItem[]
  metrics: TeacherMetric[]
  deadlines: DashboardDeadline[]
  checkIns: TeacherCheckInItem[]
  classes: DashboardClassItem[]
  activity: ActivityLogPreview
  pulse: PulseFacts | null
  orgSlug: string
}

// ============================================================================
// Student-specific types
// ============================================================================

export type StudentNextAction = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  classId: string
  className: string
  classColor: string | null
  dueDate: Date | null
  points?: string | null
  status: "not_started" | "in_progress" | "submitted" | "graded"
  grade?: string | null
  actionLabel: string
  actionHref: string
}

export type StudentAttentionItem =
  | {
      kind: "due_soon"
      id: string
      title: string
      type: "assignment" | "quiz" | "material"
      classId: string
      className: string
      classColor: string | null
      dueDate: Date
      points?: string | null
      isSubmitted: boolean
    }
  | {
      kind: "graded"
      id: string
      title: string
      classId: string
      className: string
      classColor: string | null
      gradedAt: string
      grade: string
      points: string | null
    }
  | {
      kind: "unread_message"
      id: string
      senderName: string
      preview: string
      createdAt: string
    }
  | {
      kind: "announcement"
      id: string
      title: string
      classId: string
      className: string
      classColor: string | null
      createdAt: string
    }

export type StudentTimelineItem = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  classId: string
  className: string
  classColor: string | null
  dueDate: Date
  points?: string | null
  isSubmitted: boolean
  isGraded: boolean
  bucket: "today" | "this_week" | "later" | "completed"
}

export type StudentFeedbackItem = {
  id: string
  classworkTitle: string
  classId: string
  className: string
  classColor: string | null
  gradedAt: string
  grade: string
  feedback?: string | null
  points: string | null
}

export type StudentMessagePreview = {
  id: string
  senderName: string
  preview: string
  createdAt: string
  isRead: boolean
}

export type StudentDashboardViewModel = {
  role: "student"
  header: DashboardHeaderModel
  nextAction: StudentNextAction | null
  attention: StudentAttentionItem[]
  timeline: StudentTimelineItem[]
  classes: DashboardClassItem[]
  feedback: StudentFeedbackItem[]
  messages: StudentMessagePreview[]
  activity: ActivityLogPreview
  pulse: PulseFacts | null
  orgSlug: string
}

// ============================================================================
// Union type
// ============================================================================

export type DashboardViewModel =
  | AdminDashboardViewModel
  | TeacherDashboardViewModel
  | StudentDashboardViewModel
