import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function GenericPageSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
        </div>
    )
}

export function AnnouncementSkeleton() {
    return (
        <Card className="border-border/60 overflow-hidden border-l-[6px] border-l-muted">
            <CardHeader className="pb-3 pl-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-5 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[80%]" />
            </CardContent>
            <div className="px-6 py-3 border-t bg-muted/5 flex items-center justify-between pl-5">
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>
        </Card>
    )
}

export function ResourceCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border bg-card h-full">
            {/* Header Area */}
            <div className="relative h-32 flex items-center justify-center bg-muted/30">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="absolute top-3 right-3">
                    <Skeleton className="h-5 w-12 rounded-md" />
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-5 space-y-4">
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-3/4" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border/50">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function ResourcesPageSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-20 rounded-md" />
                    ))}
                </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ResourceCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function DashboardHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
        </div>
    )
}

export function ClassStreamSkeleton() {
    return (
        <div className="max-w-4xl mx-auto w-full space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" /> {/* Banner/Input area */}
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <AnnouncementSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function MemberSkeleton() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg border border-border/40 bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
            </div>
        </div>
    )
}

export function ClassCardSkeleton() {
    return (
        <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border bg-card">
            <div className="relative h-28 w-full bg-muted/40">
                <div className="absolute top-3 right-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
            <div className="flex flex-1 flex-col p-5 pt-10 relative">
                <div className="absolute -top-7 left-5">
                    <Skeleton className="h-14 w-14 rounded-full border-4 border-card" />
                </div>
                <div className="space-y-2 mb-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="mt-auto pt-4 border-t flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
        </div>
    )
}

export function ClassesPageSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-10 w-full rounded-xl sm:w-72" />
                <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ClassCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function ClassDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6 -mt-4">
            {/* Banner */}
            <div className="relative w-full rounded-b-xl overflow-hidden shadow-sm h-[240px] bg-muted/30">
                <div className="absolute bottom-0 left-0 w-full p-8">
                    <Skeleton className="h-10 w-1/3 mb-4" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
            </div>
            {/* Tabs */}
            <div className="border-b w-full px-4">
                <div className="flex items-center gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-20 mb-2" />
                    ))}
                </div>
            </div>
            {/* Content */}
            <div className="max-w-4xl mx-auto w-full space-y-4 px-1">
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <AnnouncementSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ClassworkCardSkeleton() {
    return (
        <Card className="overflow-hidden border-border/60 border-l-[6px] border-l-muted">
            <CardHeader className="pl-5 pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Skeleton className="mt-1 h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-4 w-14" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </div>
                    <Skeleton className="h-8 w-32 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="pl-5 pt-0">
                <div className="ml-[3.25rem] space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%]" />
                    <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-8 w-28 rounded-md" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function QuizCardSkeleton() {
    return (
        <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-64" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
            </CardContent>
        </Card>
    )
}

export function StreamTabSkeleton() {
    return (
        <div className="max-w-4xl mx-auto w-full space-y-4 px-1">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <AnnouncementSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function ClassworkTabSkeleton() {
    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 px-1">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <ClassworkCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function QuizTabSkeleton() {
    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 px-1">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <QuizCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function PeopleTabSkeleton() {
    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8 px-1">
            <div className="space-y-4">
                <Skeleton className="h-8 w-28" />
                <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <MemberSkeleton key={i} />
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <MemberSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ClassDetailTabSkeleton({
    activeTab,
}: {
    activeTab: "stream" | "classwork" | "quizzes" | "people"
}) {
    if (activeTab === "classwork") return <ClassworkTabSkeleton />
    if (activeTab === "quizzes") return <QuizTabSkeleton />
    if (activeTab === "people") return <PeopleTabSkeleton />
    return <StreamTabSkeleton />
}

export function NotificationsSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
            </div>

            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative flex items-start gap-4 p-4 rounded-xl border bg-card">
                        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-5 w-16 hidden sm:block" />
                                </div>
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-24 mt-2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function NotificationsContentSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="relative flex items-start gap-4 rounded-xl border bg-card p-4">
                    <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0 pt-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-5 w-16 hidden sm:block" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function MessagesSkeleton() {
    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
            <div className="flex flex-row items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-40 rounded-md" />
            </div>

            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                <Skeleton className="h-11 w-full rounded-md" />

                <div className="flex-1 overflow-y-auto space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-transparent bg-card/40">
                            <Skeleton className="h-12 w-12 rounded-full border border-border/50" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function MessagesContentSkeleton() {
    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-12rem)]">
            <div className="flex justify-end">
                <Skeleton className="h-10 w-40 rounded-md" />
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
            <div className="flex-1 overflow-y-auto space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-transparent bg-card/40 p-4">
                        <Skeleton className="h-12 w-12 rounded-full border border-border/50" />
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function SettingsSkeleton() {
    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-1">
                <Skeleton className="h-9 w-32 mb-2" />
                <Skeleton className="h-6 w-96" />
            </div>

            <div className="flex flex-col gap-8">
                {/* Horizontal Tabs Skeleton */}
                <div className="border-b">
                    <div className="flex gap-4 px-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="px-4 py-3 border-b-2 border-transparent">
                                <Skeleton className="h-5 w-24" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area Skeleton (Profile Style) */}
                <div className="space-y-6">
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="space-y-2">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                                <Skeleton className="h-28 w-28 rounded-full border-4 border-background" />
                                <div className="space-y-4 flex-1 w-full flex flex-col items-center sm:items-start">
                                    <div className="space-y-2 text-center sm:text-left w-full">
                                        <Skeleton className="h-6 w-32 mx-auto sm:mx-0" />
                                        <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
                                    </div>
                                    <div className="flex gap-3">
                                        <Skeleton className="h-9 w-28 rounded-md" />
                                        <Skeleton className="h-9 w-20 rounded-md" />
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full rounded-md" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-24 w-full rounded-md" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-10 w-full rounded-md" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Skeleton className="h-10 w-32 rounded-md" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export function HomeOverviewSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Skeleton className="h-[28rem] rounded-2xl lg:col-span-1" />
                <Skeleton className="h-[28rem] rounded-2xl lg:col-span-2" />
            </div>
        </div>
    )
}

export function HomeActivitySkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-[22rem] rounded-2xl lg:col-span-2" />
            <Skeleton className="h-[22rem] rounded-2xl lg:col-span-1" />
        </div>
    )
}
