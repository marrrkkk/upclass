"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, GraduationCap } from "lucide-react"

import { gradeSubmission } from "@/app/actions/class-detail"
import { gradeQuizAttempt } from "@/app/actions/quizzes"
import { ClassworkGradingDialog } from "@/components/classes/classwork-grading-dialog"
import { QuizReviewDialog } from "@/components/classes/quiz-review-dialog"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { MobileDataList, MobileDataRow } from "@/components/ui/mobile-data"
import { Panel } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type {
  ClassworkData,
  GradebookCell,
  GradebookItem,
  GradebookRow,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"

type GradebookTabProps = {
  classId: string
  members: MemberData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
}

type GradingTarget =
  | { kind: "classwork"; submissionId: string }
  | { kind: "quiz"; quizId: string; attemptId: string }
  | null

function formatDueDate(dateString: string | null) {
  if (!dateString) return "No due date"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function cellLabel(cell: GradebookCell, points: string | null) {
  switch (cell.status) {
    case "graded":
      return (
        <span className="inline-flex items-center gap-1 font-medium text-success-text">
          {cell.score ?? "—"}
          {points ? <span className="font-normal text-muted-foreground">/{points}</span> : null}
        </span>
      )
    case "submitted":
      return <StatusBadge tone="info">Submitted</StatusBadge>
    case "draft":
      return <StatusBadge tone="warning">Draft</StatusBadge>
    case "pending_review":
      return <StatusBadge tone="warning">Pending</StatusBadge>
    default:
      return <Text variant="caption" tone="subtle">Not submitted</Text>
  }
}

function computeAverage(row: GradebookRow, items: GradebookItem[]) {
  let earned = 0
  let total = 0

  row.cells.forEach((cell, index) => {
    if (cell.status !== "graded") return
    const points = Number(items[index]?.points)
    if (!Number.isFinite(points) || points <= 0) return
    earned += Number(cell.score ?? 0)
    total += points
  })

  if (total === 0) return null
  return `${Math.round((earned / total) * 100)}%`
}

function MobileGradebookRow({
  row,
  items,
  onCellClick,
}: {
  row: GradebookRow
  items: GradebookItem[]
  onCellClick: (cell: GradebookCell) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const completedCount = row.cells.filter((cell) => cell.status === "graded" || cell.status === "submitted").length
  const gradedCount = row.cells.filter((cell) => cell.status === "graded").length

  return (
    <MobileDataRow className="flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="touch-target flex min-w-0 items-center gap-3 text-left"
      >
        <EntityAvatar
          name={row.studentName}
          image={row.studentImage}
          colorKey={row.studentId}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <Text variant="h4" truncate className="block">
            {row.studentName}
          </Text>
          <Text variant="caption" tone="muted">
            {gradedCount} graded · {completedCount} submitted
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {row.average ? (
            <span className="numeric-tabular type-h4 font-semibold text-foreground">
              {row.average}
            </span>
          ) : (
            <Text variant="caption" tone="subtle">
              No grades
            </Text>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-hairline pt-2">
          {row.cells.map((cell, index) => {
            const item = items[index]
            if (!item) return null

            return (
              <div
                key={cell.itemId}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1.5",
                  cell.status !== "unsubmitted" && "hover:bg-surface-hover",
                )}
              >
                <div className="min-w-0 flex-1">
                  <Text variant="small" truncate className="block font-medium">
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="muted" className="block">
                    {formatDueDate(item.dueDate)}
                    {item.points ? ` · ${item.points} pts` : ""}
                  </Text>
                </div>
                <div className="shrink-0">
                  {cell.status === "unsubmitted" ? (
                    <Text variant="caption" tone="subtle">
                      Not submitted
                    </Text>
                  ) : (
                    <button
                      type="button"
                      className="touch-target focus-ring rounded-md px-2 py-1"
                      onClick={() => onCellClick(cell)}
                    >
                      {cellLabel(cell, item.points)}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </MobileDataRow>
  )
}

function MobileGradebook({
  rows,
  items,
  onCellClick,
}: {
  rows: GradebookRow[]
  items: GradebookItem[]
  onCellClick: (cell: GradebookCell) => void
}) {
  return (
    <MobileDataList label="Student grades">
      {rows.map((row) => (
        <MobileGradebookRow
          key={row.studentId}
          row={row}
          items={items}
          onCellClick={onCellClick}
        />
      ))}
    </MobileDataList>
  )
}

export function GradebookTab({
  members,
  classwork,
  submissions,
  quizzes,
}: GradebookTabProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [gradingTarget, setGradingTarget] = useState<GradingTarget>(null)
  const isMobile = useIsMobile()

  const students = useMemo(
    () =>
      members
        .filter((member) => member.role === "student")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [members],
  )

  const items = useMemo<GradebookItem[]>(() => {
    const classworkItems: GradebookItem[] = classwork
      .filter((item) => item.type === "assignment" || item.type === "quiz")
      .map((item) => ({
        id: item.id,
        kind: "classwork",
        title: item.title,
        dueDate: item.dueDate,
        points: item.points,
      }))

    const quizItems: GradebookItem[] = quizzes
      .filter((quiz) => quiz.status === "published")
      .map((quiz) => ({
        id: quiz.id,
        kind: "quiz",
        title: quiz.title,
        dueDate: quiz.dueDate,
        points: quiz.totalPoints,
      }))

    return [...classworkItems, ...quizItems]
  }, [classwork, quizzes])

  const rows = useMemo<GradebookRow[]>(
    () =>
      students.map((student) => {
        const cells: GradebookCell[] = items.map((item) => {
          if (item.kind === "classwork") {
            const submission = submissions.find(
              (entry) => entry.classworkId === item.id && entry.studentId === student.id,
            )
            if (!submission) {
              return { itemId: item.id, score: null, status: "unsubmitted", submissionId: null, attemptId: null }
            }
            return {
              itemId: item.id,
              score: submission.grade,
              status: submission.status === "graded"
                ? "graded"
                : submission.status === "draft"
                  ? "draft"
                  : "submitted",
              submissionId: submission.id,
              attemptId: null,
            }
          }

          const quiz = quizzes.find((entry) => entry.id === item.id)
          const attempt = quiz?.attempts.find((entry) => entry.studentId === student.id)
          if (!attempt) {
            return { itemId: item.id, score: null, status: "unsubmitted", submissionId: null, attemptId: null }
          }
          return {
            itemId: item.id,
            score: attempt.score,
            status: attempt.status === "graded" ? "graded" : "pending_review",
            submissionId: null,
            attemptId: attempt.id,
          }
        })

        const row: GradebookRow = {
          studentId: student.id,
          studentName: student.name,
          studentImage: student.image,
          cells,
          average: null,
        }
        row.average = computeAverage(row, items)
        return row
      }),
    [items, quizzes, students, submissions],
  )

  const handleCellClick = (cell: GradebookCell) => {
    if (cell.status === "unsubmitted") return

    if (cell.submissionId) {
      setGradingTarget({ kind: "classwork", submissionId: cell.submissionId })
      return
    }
    if (cell.attemptId) {
      const quiz = quizzes.find((entry) => entry.id === cell.itemId)
      if (quiz) {
        setGradingTarget({ kind: "quiz", quizId: quiz.id, attemptId: cell.attemptId })
      }
    }
  }

  const gradingSubmission = useMemo(() => {
    if (gradingTarget?.kind !== "classwork") return null
    return submissions.find((entry) => entry.id === gradingTarget.submissionId) ?? null
  }, [gradingTarget, submissions])

  const gradingItem = useMemo(() => {
    if (!gradingSubmission) return null
    return classwork.find((entry) => entry.id === gradingSubmission.classworkId) ?? null
  }, [classwork, gradingSubmission])

  const reviewQuiz = useMemo(() => {
    if (gradingTarget?.kind !== "quiz") return null
    return quizzes.find((entry) => entry.id === gradingTarget.quizId) ?? null
  }, [gradingTarget, quizzes])

  const handleGradeSubmission = (submissionId: string, formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await gradeSubmission(submissionId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setGradingTarget(null)
      router.refresh()
    })
  }

  const handleSaveQuizGrades = async (
    attemptId: string,
    grades: Array<{ answerId: string; pointsAwarded: number }>,
  ) => {
    setError(null)
    const fd = new FormData()
    fd.append("grades", JSON.stringify({ answers: grades }))
    const result = await gradeQuizAttempt(attemptId, fd)
    if (result.success) {
      setGradingTarget(null)
      router.refresh()
    } else {
      setError(result.error)
    }
    return result
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            icon={<GraduationCap />}
            title="No gradeable items yet"
            description="Create classwork or quizzes to start recording grades."
          />
        </Panel>
      ) : students.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            icon={<GraduationCap />}
            title="No students enrolled"
            description="Share the join code so students can enroll and submit work."
          />
        </Panel>
      ) : isMobile ? (
        <MobileGradebook rows={rows} items={items} onCellClick={handleCellClick} />
      ) : (
        <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
          <div className="scroll-x-region">
            <DataTable>
              <DataTableHead>
                <DataTableHeadCell className="sticky left-0 z-10 bg-surface-sunken">Student</DataTableHeadCell>
                {items.map((item) => (
                  <DataTableHeadCell key={item.id}>
                    <span className="block max-w-40 truncate" title={item.title}>{item.title}</span>
                    <span className="block font-normal normal-case opacity-75">
                      {formatDueDate(item.dueDate)}
                      {item.points ? ` · ${item.points} pts` : ""}
                    </span>
                  </DataTableHeadCell>
                ))}
                <DataTableHeadCell align="right">Average</DataTableHeadCell>
              </DataTableHead>
              <DataTableBody>
                {rows.length === 0 ? (
                  <DataTableEmptyRow colSpan={items.length + 2}>
                    <EmptyState
                      icon={<GraduationCap />}
                      title="No students enrolled"
                      description="Students join with the class code and appear here."
                    />
                  </DataTableEmptyRow>
                ) : (
                  rows.map((row) => (
                    <DataTableRow key={row.studentId}>
                      <DataTableCell className="sticky left-0 z-10 bg-card group-hover/row:bg-muted/50">
                        <div className="flex min-w-0 items-center gap-2">
                          <EntityAvatar name={row.studentName} image={row.studentImage} colorKey={row.studentId} size="xs" />
                          <Text variant="small" truncate>{row.studentName}</Text>
                        </div>
                      </DataTableCell>
                      {row.cells.map((cell) => (
                        <DataTableCell key={cell.itemId} align="center" className="whitespace-nowrap">
                          {cell.status === "unsubmitted" ? (
                            <span aria-disabled="true" title="Not submitted">{cellLabel(cell, null)}</span>
                          ) : (
                            <button
                              type="button"
                              className="focus-ring row-interactive rounded-md px-1.5 py-0.5"
                              onClick={() => handleCellClick(cell)}
                              title={`Grade ${row.studentName} — ${items.find((entry) => entry.id === cell.itemId)?.title ?? ""}`}
                            >
                              {cellLabel(cell, items.find((entry) => entry.id === cell.itemId)?.points ?? null)}
                            </button>
                          )}
                        </DataTableCell>
                      ))}
                      <DataTableCell align="right" className="numeric-tabular font-medium">
                        {row.average ?? "—"}
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </div>
        </Panel>
      )}

      {gradingSubmission && gradingItem ? (
        <ClassworkGradingDialog
          open={!!gradingTarget}
          onOpenChange={(open) => !open && setGradingTarget(null)}
          submission={gradingSubmission}
          item={gradingItem}
          error={error}
          pending={pending}
          onGrade={handleGradeSubmission}
        />
      ) : null}

      {reviewQuiz && gradingTarget?.kind === "quiz" ? (
        <QuizReviewDialog
          key={gradingTarget.attemptId}
          open={!!gradingTarget}
          onOpenChange={(open) => !open && setGradingTarget(null)}
          quiz={reviewQuiz}
          initialAttemptId={gradingTarget.attemptId}
          onSaveGrades={handleSaveQuizGrades}
        />
      ) : null}
    </div>
  )
}