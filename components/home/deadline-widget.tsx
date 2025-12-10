"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import {
    Clock,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    FileText,
    ClipboardCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, isPast, isToday, isTomorrow, differenceInHours } from "date-fns"

export type DeadlineItem = {
    id: string
    title: string
    type: "assignment" | "quiz" | "material"
    dueDate: Date
    classId: string
    className: string
    classColor: string
    points?: string | null
    isSubmitted?: boolean
}

type DeadlineWidgetProps = {
    deadlines: DeadlineItem[]
    role: "teacher" | "student" | null
}

function getUrgencyLevel(dueDate: Date): "overdue" | "urgent" | "soon" | "normal" {
    if (isPast(dueDate)) return "overdue"
    const hoursLeft = differenceInHours(dueDate, new Date())
    if (hoursLeft <= 24) return "urgent"
    if (hoursLeft <= 72) return "soon"
    return "normal"
}

function getUrgencyStyles(urgency: "overdue" | "urgent" | "soon" | "normal") {
    switch (urgency) {
        case "overdue":
            return {
                card: "border-l-4 border-l-destructive bg-destructive/5",
                badge: "bg-destructive/20 text-destructive border-destructive/30",
                text: "text-destructive"
            }
        case "urgent":
            return {
                card: "border-l-4 border-l-amber-500 bg-amber-500/5",
                badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
                text: "text-amber-600 dark:text-amber-400"
            }
        case "soon":
            return {
                card: "border-l-4 border-l-blue-500 bg-blue-500/5",
                badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
                text: "text-blue-600 dark:text-blue-400"
            }
        default:
            return {
                card: "border-l-4 border-l-muted",
                badge: "bg-muted text-muted-foreground",
                text: "text-muted-foreground"
            }
    }
}

function formatDueDate(dueDate: Date): string {
    if (isPast(dueDate)) return "Overdue"
    if (isToday(dueDate)) return "Due today"
    if (isTomorrow(dueDate)) return "Due tomorrow"
    return `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`
}

function DeadlineCard({ deadline }: { deadline: DeadlineItem }) {
    const urgency = getUrgencyLevel(deadline.dueDate)
    const styles = getUrgencyStyles(urgency)

    const TypeIcon = deadline.type === "quiz" ? ClipboardCheck : FileText

    return (
        <Link href={`/home/classes/${deadline.classId}`}>
            <div className={cn(
                "p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer group",
                styles.card
            )}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: deadline.classColor }}
                            />
                            <span className="text-xs text-muted-foreground truncate">
                                {deadline.className}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                                {deadline.title}
                            </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDueDate(deadline.dueDate)}
                            </Badge>

                            {deadline.points && (
                                <Badge variant="outline" className="text-xs">
                                    {deadline.points} pts
                                </Badge>
                            )}

                            {deadline.type && (
                                <Badge variant="secondary" className="text-xs capitalize">
                                    {deadline.type}
                                </Badge>
                            )}

                            {deadline.isSubmitted && (
                                <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Submitted
                                </Badge>
                            )}
                        </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
            </div>
        </Link>
    )
}

export function DeadlineWidget({ deadlines, role }: DeadlineWidgetProps) {
    const sortedDeadlines = [...deadlines].sort((a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )

    const overdueCount = sortedDeadlines.filter(d => isPast(d.dueDate) && !d.isSubmitted).length
    const urgentCount = sortedDeadlines.filter(d => {
        const urgency = getUrgencyLevel(d.dueDate)
        return urgency === "urgent" && !d.isSubmitted
    }).length

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                            {role === "teacher" ? "Class Deadlines" : "Upcoming Deadlines"}
                        </CardTitle>
                        {overdueCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {overdueCount} overdue
                            </Badge>
                        )}
                        {urgentCount > 0 && !overdueCount && (
                            <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {urgentCount} due soon
                            </Badge>
                        )}
                    </div>

                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/home/classes">
                            View all
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {sortedDeadlines.length === 0 ? (
                    <Empty>
                        <EmptyMedia variant="icon">
                            <CheckCircle2 className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>All caught up!</EmptyTitle>
                        <EmptyDescription>
                            {role === "teacher"
                                ? "No upcoming deadlines in your classes"
                                : "No pending assignments or quizzes"}
                        </EmptyDescription>
                    </Empty>
                ) : (
                    <>
                        {sortedDeadlines.slice(0, 5).map((deadline) => (
                            <DeadlineCard key={deadline.id} deadline={deadline} />
                        ))}

                        {sortedDeadlines.length > 5 && (
                            <p className="text-sm text-muted-foreground text-center pt-2">
                                +{sortedDeadlines.length - 5} more deadlines
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
