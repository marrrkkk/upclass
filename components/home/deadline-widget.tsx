"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { usePrefetch } from "@/lib/hooks/use-prefetch"
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
    Calendar,
    Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, isPast, isToday, isTomorrow, differenceInHours, format } from "date-fns"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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

const DeadlineCard = memo(function DeadlineCard({ deadline }: { deadline: DeadlineItem }) {
    const { prefetchOnHover, cancelPrefetch } = usePrefetch()
    const urgency = getUrgencyLevel(deadline.dueDate)
    const urgencyColor = getUrgencyColors(urgency)
    const TypeIcon = deadline.type === "quiz" ? ClipboardCheck : FileText
    const classHref = `/classes/${deadline.classId}`

    return (
        <Link 
            href={classHref} 
            prefetch={true}
            onMouseEnter={() => prefetchOnHover(classHref)}
            onMouseLeave={() => cancelPrefetch(classHref)}
        >
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
})

function AllDeadlinesDialog({ deadlines, role, open, onOpenChange }: {
    deadlines: DeadlineItem[],
    role: "teacher" | "student" | null,
    open: boolean,
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-muted/5 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Calendar className="h-5 w-5 text-primary" />
                        All Upcoming Deadlines
                    </DialogTitle>
                    <DialogDescription>
                        {role === "teacher"
                            ? `You have ${deadlines.length} upcoming deadlines across your classes.`
                            : `You have ${deadlines.length} assignments due.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {deadlines.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">All Caught Up!</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                                    {role === "teacher"
                                        ? "There are no upcoming deadlines scheduled for your classes."
                                        : "Great job! You have no pending assignments at the moment."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider px-2">
                                <span>Timeline</span>
                                <span>{deadlines.length} Tasks</span>
                            </div>
                            <div className="space-y-1">
                                {deadlines.map((deadline) => (
                                    <DeadlineCard key={deadline.id} deadline={deadline} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function DeadlineWidget({ deadlines, role }: DeadlineWidgetProps) {
    const [open, setOpen] = useState(false)
    const sortedDeadlines = [...deadlines].sort((a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )

    return (
        <>
            <AllDeadlinesDialog
                deadlines={sortedDeadlines}
                role={role}
                open={open}
                onOpenChange={setOpen}
            />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 h-auto p-0 hover:bg-transparent"
                            onClick={() => setOpen(true)}
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </Button>
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
                                <Button
                                    variant="ghost"
                                    className="w-full text-xs text-muted-foreground mt-2 h-8"
                                    onClick={() => setOpen(true)}
                                >
                                    Show {sortedDeadlines.length - 5} more
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
