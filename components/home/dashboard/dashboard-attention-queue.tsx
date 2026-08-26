import Link from "next/link"
import { ArrowRight, CheckCircle2, ChevronRight, FileText, Mail, MessageCircle, User } from "lucide-react"
import { CourseSwatch } from "@/components/ui/course-identity"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelActions, PanelBody, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import type { StudentAttentionItem, TeacherQueueItem, AdminAttentionItem } from "./dashboard-types"
import { DashboardEmptyState } from "./dashboard-empty-state"
import { formatRelativeTime, formatDueDateFull } from "./dashboard-formatters"

type DashboardAttentionQueueProps =
  | {
      role: "teacher"
      items: TeacherQueueItem[]
      orgSlug: string
      limit?: number
      viewAllHref?: string
    }
  | {
      role: "student"
      items: StudentAttentionItem[]
      orgSlug: string
      limit?: number
      viewAllHref?: string
    }
  | {
      role: "admin"
      items: AdminAttentionItem[]
      orgSlug: string
      limit?: number
      viewAllHref?: string
    }

/**
 * Role-specific attention/work queue for dashboard.
 * Teacher: submissions, questions, overdue alerts.
 * Student: due work, graded work, messages, announcements.
 * Admin: pending invitations, recent classes, recent memberships.
 */
export function DashboardAttentionQueue(props: DashboardAttentionQueueProps) {
  const { role, items, orgSlug, limit = 8, viewAllHref } = props
  const visible = items.slice(0, limit)

  const title = role === "teacher" 
    ? "Teaching queue" 
    : role === "student" 
      ? "Attention" 
      : "Organization attention"

  const emptyTitle = role === "teacher"
    ? "Your teaching queue is clear"
    : role === "student"
      ? "Nothing needs attention"
      : "No pending organization work"

  const emptyDescription = role === "teacher"
    ? "New submissions and student questions will appear here."
    : role === "student"
      ? "New work, messages, and graded assignments will appear here."
      : "Pending invitations and recent changes will appear here."

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle>{title}</PanelTitle>
        </PanelHeading>
        {visible.length > 0 && (
          <PanelActions>
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="type-caption font-medium text-primary-text transition-colors hover:opacity-80"
              >
                View all ({items.length})
              </Link>
            ) : (
              <span className="type-caption font-medium text-foreground-muted">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            )}
          </PanelActions>
        )}
      </PanelHeader>
      <PanelBody className="p-0">
        {visible.length === 0 ? (
          <DashboardEmptyState
            icon={CheckCircle2}
            title={emptyTitle}
            description={emptyDescription}
            compact
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((item) => {
              if (role === "teacher") {
                return <TeacherQueueRow key={item.id} item={item as TeacherQueueItem} orgSlug={orgSlug} />
              }
              if (role === "student") {
                return <StudentAttentionRow key={item.id} item={item as StudentAttentionItem} orgSlug={orgSlug} />
              }
              return <AdminAttentionRow key={item.id} item={item as AdminAttentionItem} orgSlug={orgSlug} />
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  )
}

function TeacherQueueRow({ item, orgSlug }: { item: TeacherQueueItem; orgSlug: string }) {
  if (item.kind === "submission") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/classes/${item.classId}/classwork/${item.classworkId}/submissions/${item.submissionId}`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <CourseSwatch value={item.classColor} courseKey={item.classId} size="md" />
          <span className="min-w-0 flex-1 space-y-0.5">
            <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
              {item.classworkTitle}
            </Text>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              {item.studentName} · {item.className}
            </Text>
            <Text as="span" variant="caption" tone="muted">
              {item.submittedAt ? formatRelativeTime(item.submittedAt) : "Not submitted"}
              {item.attachmentCount > 0 && ` · ${item.attachmentCount} attachment${item.attachmentCount === 1 ? "" : "s"}`}
            </Text>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </li>
    )
  }

  if (item.kind === "question") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/messages`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <IconBadge tone="primary" size="md" variant="soft">
            <MessageCircle className="size-4" />
          </IconBadge>
          <span className="min-w-0 flex-1 space-y-0.5">
            <Text as="span" variant="h4" className="block font-semibold group-hover:text-primary-text">
              {item.count} unread student {item.count === 1 ? "question" : "questions"}
            </Text>
            <Text as="span" variant="small" tone="muted">
              Review and respond to student inquiries
            </Text>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </li>
    )
  }

  return (
    <li>
      <div className="flex min-w-0 items-center gap-3.5 px-4 py-3.5 sm:px-5">
        <IconBadge tone="warning" size="md" variant="soft">
          <FileText className="size-4" />
        </IconBadge>
        <span className="min-w-0 flex-1 space-y-0.5">
          <Text as="span" variant="h4" className="block font-semibold text-warning-text">
            {item.count} overdue {item.count === 1 ? "submission" : "submissions"}
          </Text>
          <Text as="span" variant="small" tone="muted">
            Students have missed assignment deadlines
          </Text>
        </span>
      </div>
    </li>
  )
}

function StudentAttentionRow({ item, orgSlug }: { item: StudentAttentionItem; orgSlug: string }) {
  if (item.kind === "due_soon") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/classes/${item.classId}?tab=classwork`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <CourseSwatch value={item.classColor} courseKey={item.classId} size="md" />
          <span className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
                {item.title}
              </Text>
              {item.isSubmitted && (
                <StatusBadge tone="success" size="sm">
                  Submitted
                </StatusBadge>
              )}
            </div>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              {item.className} · {item.type === "quiz" ? "Quiz" : "Assignment"}
            </Text>
            <Text as="span" variant="caption" tone="muted">
              {formatDueDateFull(item.dueDate)}
              {item.points && ` · ${item.points} points`}
            </Text>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </li>
    )
  }

  if (item.kind === "graded") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/classes/${item.classId}?tab=classwork`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <CourseSwatch value={item.classColor} courseKey={item.classId} size="md" />
          <span className="min-w-0 flex-1 space-y-0.5">
            <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
              {item.title}
            </Text>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              {item.className} · Graded
            </Text>
            <Text as="span" variant="caption" tone="muted">
              {formatRelativeTime(item.gradedAt)} · {item.grade}
              {item.points && ` out of ${item.points}`}
            </Text>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </li>
    )
  }

  if (item.kind === "unread_message") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/messages`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <IconBadge tone="info" size="md" variant="soft">
            <Mail className="size-4" />
          </IconBadge>
          <span className="min-w-0 flex-1 space-y-0.5">
            <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
              Message from {item.senderName}
            </Text>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              {item.preview}
            </Text>
            <Text as="span" variant="caption" tone="muted">
              {formatRelativeTime(item.createdAt)}
            </Text>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={`/${orgSlug}/classes/${item.classId}`}
        className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
      >
        <CourseSwatch value={item.classColor} courseKey={item.classId} size="md" />
        <span className="min-w-0 flex-1 space-y-0.5">
          <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
            {item.title}
          </Text>
          <Text as="span" variant="small" tone="muted" truncate className="block">
            {item.className} · Announcement
          </Text>
          <Text as="span" variant="caption" tone="muted">
            {formatRelativeTime(item.createdAt)}
          </Text>
        </span>
        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </li>
  )
}

function AdminAttentionRow({ item, orgSlug }: { item: AdminAttentionItem; orgSlug: string }) {
  if (item.kind === "pending_invitation") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/admin/people?tab=invitations`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <IconBadge tone="warning" size="md" variant="soft">
            <Mail className="size-4" />
          </IconBadge>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
                Pending invitation
              </Text>
              <StatusBadge tone="warning" size="sm">
                {item.role}
              </StatusBadge>
            </span>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              {item.email}
            </Text>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Text as="span" variant="caption" tone="muted" className="hidden sm:block">
              Invited {formatRelativeTime(item.invitedAt)}
            </Text>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </span>
        </Link>
      </li>
    )
  }

  if (item.kind === "recent_class") {
    return (
      <li>
        <Link
          href={`/${orgSlug}/classes/${item.id}`}
          className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
        >
          <CourseSwatch value={item.color} courseKey={item.id} size="md" className="rounded-full" />
          <span className="min-w-0 flex-1 space-y-0.5">
            <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
              {item.title}
            </Text>
            <Text as="span" variant="small" tone="muted" truncate className="block">
              New class · {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
            </Text>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Text as="span" variant="caption" tone="muted" className="hidden sm:block">
              Created {formatRelativeTime(item.createdAt)}
            </Text>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </span>
        </Link>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={`/${orgSlug}/admin/people`}
        className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5"
      >
        <IconBadge tone="success" size="md" variant="soft">
          <User className="size-4" />
        </IconBadge>
        <span className="min-w-0 flex-1 space-y-0.5">
          <Text as="span" variant="h4" truncate className="block font-semibold group-hover:text-primary-text">
            {item.userName} joined
          </Text>
          <Text as="span" variant="small" tone="muted" truncate className="block">
            {item.classTitle} · {item.role}
          </Text>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Text as="span" variant="caption" tone="muted" className="hidden sm:block">
            {formatRelativeTime(item.joinedAt)}
          </Text>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </span>
      </Link>
    </li>
  )
}

