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
    ClipboardCheck,
    Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, isPast, isToday, isTomorrow, differenceInHours, format } from "date-fns"

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

function getUrgencyColors(urgency: "overdue" | "urgent" | "soon" | "normal") {
    switch (urgency) {
        case "overdue": return "text-destructive"
        case "urgent": return "text-amber-600 dark:text-amber-400"
        case "soon": return "text-blue-600 dark:text-blue-400"
        default: return "text-muted-foreground"
    }
}

function formatValidDate(date: Date) {
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return format(date, "MMM d")
}

function DeadlineCard({ deadline }: { deadline: DeadlineItem }) {
    const urgency = getUrgencyLevel(deadline.dueDate)
    const urgencyColor = getUrgencyColors(urgency)
    const TypeIcon = deadline.type === "quiz" ? ClipboardCheck : FileText

    return (
        <Link href={`/home/classes/${deadline.classId}`}>
            <div className="group relative flex items-center gap-4 p-3 rounded-xl border border-transparent hover:bg-muted/40 hover:border-border/50 transition-all duration-200">
                {/* Date Box */}
                <div className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted/30 border border-border/50 shrink-0",
                    urgency === 'urgent' && "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40",
                    urgency === 'overdue' && "bg-destructive/5 border-destructive/20"
                )}>
                    <span className={cn("text-[10px] font-semibold uppercase", urgencyColor)}>
                        {format(deadline.dueDate, "MMM")}
                    </span>
                    <span className={cn("text-lg font-bold leading-none", urgencyColor)}>
                        {format(deadline.dueDate, "d")}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deadline.classColor }} />
                            <span className="truncate max-w-[120px]">{deadline.className}</span>
                        </div>
                        {urgency === 'urgent' && (
                            <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/40">Due soon</Badge>
                        )}
                        {urgency === 'overdue' && (
                            <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] bg-destructive/5 text-destructive border-destructive/20">Overdue</Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
                            {deadline.title}
                        </h4>
                        {deadline.isSubmitted && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(deadline.dueDate, { addSuffix: true })}
                        </span>
                        {deadline.points && (
                            <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{deadline.points} pts</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ArrowRight className="h-4 w-4" />
                    </div>
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

    return (
        <Card className="h-full border-0 shadow-lg flex flex-col overflow-hidden">
            <CardHeader className="py-4 px-6 border-b bg-muted/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base font-semibold">
                            {role === "teacher" ? "Upcoming Deadlines" : "My Assignments"}
                        </CardTitle>
                    </div>
                    <Link href="/home/classes" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 overflow-y-auto max-h-[400px]">
                {sortedDeadlines.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">All caught up!</h3>
                        <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                            {role === "teacher"
                                ? "No upcoming deadlines in your classes"
                                : "You have no pending assignments"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedDeadlines.slice(0, 5).map((deadline) => (
                            <DeadlineCard key={deadline.id} deadline={deadline} />
                        ))}

                        {sortedDeadlines.length > 5 && (
                            <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2 h-8">
                                Show {sortedDeadlines.length - 5} more
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
