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
}

function StatCard({ title, value, icon, description, variant = "default" }: StatCardProps) {
    const variantStyles = {
        default: "bg-card",
        warning: "bg-amber-500/10 border-amber-500/20",
        success: "bg-emerald-500/10 border-emerald-500/20",
        info: "bg-primary/10 border-primary/20",
    }

    const iconVariantStyles = {
        default: "bg-muted text-muted-foreground",
        warning: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        info: "bg-primary/20 text-primary",
    }

    return (
        <Card className={cn(
            "transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
            variantStyles[variant]
        )}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div className={cn(
                        "p-2.5 rounded-lg",
                        iconVariantStyles[variant]
                    )}>
                        {icon}
                    </div>
                </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
                title="Classes"
                value={stats.totalClasses}
                icon={<GraduationCap className="h-5 w-5" />}
                variant="info"
            />

            {role === "teacher" ? (
                <StatCard
                    title="Pending Reviews"
                    value={stats.pendingSubmissions || 0}
                    icon={<ClipboardList className="h-5 w-5" />}
                    description="Submissions to grade"
                    variant={stats.pendingSubmissions && stats.pendingSubmissions > 0 ? "warning" : "default"}
                />
            ) : (
                <StatCard
                    title="Pending Tasks"
                    value={stats.pendingTasks}
                    icon={<Clock className="h-5 w-5" />}
                    description="Assignments due"
                    variant={stats.pendingTasks > 0 ? "warning" : "default"}
                />
            )}

            <StatCard
                title="Messages"
                value={stats.unreadMessages}
                icon={<MessageSquare className="h-5 w-5" />}
                description="Unread"
                variant={stats.unreadMessages > 0 ? "info" : "default"}
            />

            <StatCard
                title="Notifications"
                value={stats.unreadNotifications}
                icon={<Bell className="h-5 w-5" />}
                description="New"
                variant={stats.unreadNotifications > 0 ? "info" : "default"}
            />
        </div>
    )
}
