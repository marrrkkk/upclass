import type { ActivityGraphDay, ActivityLogItem, ActivityCategory } from "@/lib/activity-ui"
import type { ClassDetailTab } from "@/lib/classes/class-detail-tabs"
import { fetchJson } from "@/lib/fetch-json"
import { mainQueryKeys } from "@/lib/query-keys"
import type { ClassCardData, ClassData, AnnouncementData, ClassworkData, SubmissionData, QuizData, MemberData } from "@/types/classes"

export type ShellRecentClass = {
  id: string
  title: string
  color: string | null
}

export type HomeClassItem = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  color: string
  category?: string | null
  memberCount: number
  role: "teacher" | "student"
}

export type HomeStatsData = {
  totalClasses: number
  pendingTasks: number
  unreadMessages: number
  unreadNotifications: number
  pendingSubmissions?: number
  overdueWork?: number
  unreadStudentQuestions?: number
  lowParticipationAlerts?: number
  completedTasks?: number
}

export type HomeDeadlineItem = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  dueDate: string
  classId: string
  className: string
  classColor: string
  points?: string | null
  isSubmitted?: boolean
}

export type TeacherReviewQueueItem = {
  submissionId: string
  classId: string
  className: string
  classColor: string
  classworkTitle: string
  studentName: string
  submittedAt: string | null
  attachmentCount: number
}

export type TeacherWeeklySummary = {
  submissions: number
  graded: number
  unreadQuestions: number
  overdue: number
}

export type TeacherLowParticipationItem = {
  userId: string
  studentName: string
  classId: string
  className: string
  lastActiveAt: string | null
}

export type HomeOverviewResponse = {
  classes: HomeClassItem[]
  deadlines: HomeDeadlineItem[]
  stats: HomeStatsData
  teacherAnalytics: {
    lowParticipation: TeacherLowParticipationItem[]
    reviewQueue: TeacherReviewQueueItem[]
    weeklySummary: TeacherWeeklySummary
  } | null
}

export type HomeActivityResponse = {
  activityGraph: {
    days: ActivityGraphDay[]
    total: number
  }
  recentActivity: ActivityLogItem[]
}

export type ClassesPageResponse = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
}

export type ResourceCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  createdAt: string
  authorName: string | null
  authorImage: string | null
}

export type ResourcesPageResponse = {
  resources: ResourceCardData[]
}

export type NotificationItem = {
  id: string
  type: "announcement" | "classwork"
  title: string
  message: string
  classId: string | null
  relatedId: string | null
  read: boolean
  createdAt: string
  className: string | null
}

export type NotificationsPageResponse = {
  notifications: NotificationItem[]
}

export type DirectThread = {
  kind: "direct"
  id: string
  userId: string
  title: string
  userName: string
  userImage: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  href: string
}

export type ChannelThread = {
  kind: "channel"
  id: string
  channelId: string
  classId: string
  title: string
  className: string
  classColor: string
  channelName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  href: string
}

export type MessagesPageResponse = {
  threads: Array<DirectThread | ChannelThread>
  channels: ChannelThread[]
}

export type ActivityPageResponse = {
  items: ActivityLogItem[]
  nextCursor: string | null
}

export type ClassDetailFrameResponse = {
  classData: ClassData
  userId: string
  userRole: "teacher" | "student"
}

export type ClassDetailTabResponse = {
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
  members: MemberData[]
}

function getScope(userId?: string) {
  return userId ?? "guest"
}

function withSearchParams(pathname: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export const mainAppQueries = {
  recentClasses: (userId: string) => ({
    queryKey: mainQueryKeys.shellRecentClasses(userId),
    queryFn: () => fetchJson<ShellRecentClass[]>("/api/main/shell/recent-classes"),
  }),
  homeOverview: (userId: string) => ({
    queryKey: mainQueryKeys.homeOverview(userId),
    queryFn: () => fetchJson<HomeOverviewResponse>("/api/main/home/overview"),
  }),
  homeActivity: (userId: string) => ({
    queryKey: mainQueryKeys.homeActivity(userId),
    queryFn: () => fetchJson<HomeActivityResponse>("/api/main/home/activity"),
  }),
  classes: (userId?: string) => ({
    queryKey: mainQueryKeys.classes(getScope(userId)),
    queryFn: () => fetchJson<ClassesPageResponse>("/api/main/classes"),
  }),
  resources: (userId?: string) => ({
    queryKey: mainQueryKeys.resources(getScope(userId)),
    queryFn: () => fetchJson<ResourcesPageResponse>("/api/main/resources"),
  }),
  notifications: (userId: string) => ({
    queryKey: mainQueryKeys.notifications(userId),
    queryFn: () => fetchJson<NotificationsPageResponse>("/api/main/notifications"),
  }),
  messages: (userId: string) => ({
    queryKey: mainQueryKeys.messages(userId),
    queryFn: () => fetchJson<MessagesPageResponse>("/api/main/messages"),
  }),
  activity: (userId: string, filter: ActivityCategory, cursor: string | null) => {
    const params = new URLSearchParams()
    if (filter !== "all") {
      params.set("filter", filter)
    }
    if (cursor) {
      params.set("cursor", cursor)
    }

    return {
      queryKey: mainQueryKeys.activity(userId, filter, cursor),
      queryFn: () => fetchJson<ActivityPageResponse>(withSearchParams("/api/main/activity", params)),
    }
  },
  classFrame: (classId: string) => ({
    queryKey: mainQueryKeys.classFrame(classId),
    queryFn: () => fetchJson<ClassDetailFrameResponse>(`/api/main/classes/${classId}/frame`),
  }),
  classTab: (classId: string, tab: ClassDetailTab) => ({
    queryKey: mainQueryKeys.classTab(classId, tab),
    queryFn: () => fetchJson<ClassDetailTabResponse>(`/api/main/classes/${classId}/tab?tab=${tab}`),
  }),
}
