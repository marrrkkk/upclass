"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
    GraduationCap,
    ClipboardList,
    MessageSquare,
    Bell,
    CheckCircle2,
    Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

type StatCardProps = {
    title: string
    value: number
    icon: React.ReactNode
    description?: string
    variant?: "default" | "warning" | "success" | "info"
    actionLabel?: string
}

function StatCard({ title, value, icon, description, variant = "default", actionLabel }: StatCardProps) {
    const variantStyles = {
        default: "from-background to-muted/20 border-border/50",
        warning: "from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/50 dark:border-amber-800/30",
        success: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30",
        info: "from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30",
    }

    const iconVariantStyles = {
        default: "bg-muted text-muted-foreground",
        warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
        success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        info: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border bg-gradient-to-br",
            variantStyles[variant]
        )}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                        "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
                        iconVariantStyles[variant]
                    )}>
                        {icon}
                    </div>
                    {actionLabel && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-background/50 px-2 py-1 rounded-full backdrop-blur-sm border border-border/10">
                            {actionLabel}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    {description && (
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{description}</p>
                    )}
                </div>

                {/* Decorative background element */}
                <div className={cn(
                    "absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity",
                    variant === 'default' ? 'bg-foreground' :
                        variant === 'warning' ? 'bg-amber-500' :
                            variant === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                )} />
            </CardContent>
        </Card>
    )
}

export type StatsData = {
    totalClasses: number
    pendingTasks: number
    unreadMessages: number
    unreadNotifications: number
    // Teacher-specific
    pendingSubmissions?: number
    // Student-specific
    completedTasks?: number
}

type StatsCardsProps = {
    stats: StatsData
    role: "teacher" | "student" | null
}

export function StatsCards({ stats, role }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Active Classes"
                value={stats.totalClasses}
                icon={<GraduationCap className="h-5 w-5" />}
                variant="info"
                description="Your learning journey"
            />

            {role === "teacher" ? (
                <StatCard
                    title="Pending Reviews"
                    value={stats.pendingSubmissions || 0}
                    icon={<ClipboardList className="h-5 w-5" />}
                    description="Submissions to grade"
                    variant={stats.pendingSubmissions && stats.pendingSubmissions > 0 ? "warning" : "default"}
                    actionLabel="Review"
                />
            ) : (
                <StatCard
                    title="Pending Tasks"
                    value={stats.pendingTasks}
                    icon={<Clock className="h-5 w-5" />}
                    description="Assignments due soon"
                    variant={stats.pendingTasks > 0 ? "warning" : "default"}
                    actionLabel="View"
                />
            )}

            <StatCard
                title="Messages"
                value={stats.unreadMessages}
                icon={<MessageSquare className="h-5 w-5" />}
                description="Unread conversations"
                variant={stats.unreadMessages > 0 ? "info" : "default"}
            />

            <StatCard
                title="Notifications"
                value={stats.unreadNotifications}
                icon={<Bell className="h-5 w-5" />}
                description="New alerts"
                variant={stats.unreadNotifications > 0 ? "info" : "default"}
            />
        </div>
    )
}
