import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ClassDetailLayout } from "@/components/classes/class-detail-layout"

export function GenericPageSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-48 rounded-xl lg:col-span-2" />
                <Skeleton className="h-48 rounded-xl" />
            </div>
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

export function AnnouncementSkeleton() {
    return (
        <Card className="border-border/60 overflow-hidden">
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
        <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <Skeleton className="h-28 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="mt-auto flex items-center gap-1.5 pt-2">
                    <Skeleton className="h-5 w-16 rounded-lg" />
                    <Skeleton className="h-5 w-14 rounded-lg" />
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-hairline/70 bg-surface-subtle/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
    )
}

export function ResourcesPageSkeleton() {
    return (
        <div className="w-full space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-hairline/80 bg-card/80 p-2 sm:p-2.5 shadow-2xs backdrop-blur-xs lg:flex-row lg:items-center">
                <Skeleton className="h-9 w-full rounded-xl sm:max-w-72" />
                <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-16 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-8 w-28 rounded-xl sm:ml-auto" />
            </div>

            <ResourcesGridSkeleton />
        </div>
    )
}

export function ResourcesGridSkeleton() {
    return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <ResourceCardSkeleton key={i} />
            ))}
        </div>
    )
}

export function DashboardHeaderSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-64 max-w-full" />
                    <Skeleton className="h-4 w-full max-w-2xl" />
                </div>
                <Skeleton className="h-10 w-36 rounded-[var(--radius-control)]" />
            </div>
        </div>
    )
}

export function ClassStreamSkeleton() {
    return (
        <div className="max-w-4xl mx-auto w-full space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
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
        <div className="flex min-h-[21rem] flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Skeleton className="h-6 w-28 rounded-lg" />
                    <Skeleton className="h-6 w-12 rounded-lg" />
                    <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-hairline/70 px-4 py-3 bg-surface-subtle/30">
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="size-5 rounded-full ring-2 ring-card" />
                        ))}
                    </div>
                    <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    )
}

export function ClassesPageSkeleton() {
    return (
        <div className="w-full space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <div className="flex gap-2.5">
                    <Skeleton className="h-9 w-28 rounded-xl" />
                    <Skeleton className="h-9 w-32 rounded-xl" />
                </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-hairline/80 bg-card/80 p-2 sm:p-2.5 shadow-2xs backdrop-blur-xs lg:flex-row lg:items-center">
                <Skeleton className="h-10 w-full rounded-xl bg-surface/50 lg:max-w-md" />
                <Skeleton className="h-6 w-20 rounded-lg bg-surface/60 lg:ml-auto" />
                <Skeleton className="h-10 w-36 rounded-xl bg-surface/50" />
            </div>
            <ClassesGridSkeleton />
        </div>
    )
}

export function ClassesGridSkeleton() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
                <ClassCardSkeleton key={i} />
            ))}
        </div>
    )
}

export function ClassDetailHeroSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-[var(--radius-floating)] bg-card">
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="size-9 rounded-xl" />
                </div>
                <Skeleton className="mt-3 h-8 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
        </div>
    )
}

export function ClassDetailNavSkeleton() {
    return (
        <>
            <Skeleton className="h-11 w-full rounded-xl lg:hidden" />
            <div className="hidden rounded-[var(--radius-container)] bg-card p-3 lg:block">
                <div className="flex flex-col gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        </>
    )
}

export function ClassDetailSkeleton() {
    return (
        <ClassDetailLayout
            hero={<ClassDetailHeroSkeleton />}
            navigation={<ClassDetailNavSkeleton />}
        >
            <StreamTabSkeleton />
        </ClassDetailLayout>
    )
}

export function StreamTabSkeleton() {
    return (
        <div className="w-full">
            <div className="flex flex-col gap-4">
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

export function ClassworkTabSkeleton() {
    return (
        <div className="w-full">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl border-2 border-dashed" />
            </div>
        </div>
    )
}

export function ClassworkCardSkeleton() {
    return (
        <Card className="overflow-hidden border-border/60">
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

export function QuizTabSkeleton() {
    return (
        <div className="w-full">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl border-2 border-dashed" />
            </div>
        </div>
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

export function GradebookTabSkeleton() {
    return (
        <div className="w-full">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
                <div className="overflow-hidden rounded-xl">
                    <Skeleton className="h-10 w-full rounded-none" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-none border-t border-hairline" />
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ClassDetailRailSkeleton() {
    return (
        <div className="flex w-full flex-col gap-5">
            <div className="rounded-xl bg-card p-4">
                <Skeleton className="h-5 w-28" />
                <div className="mt-4 flex flex-col gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="size-8 shrink-0 rounded-full" />
                            <div className="w-full space-y-1.5">
                                <Skeleton className="h-3.5 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-xl bg-card p-4">
                <Skeleton className="h-5 w-24" />
                <div className="mt-4 flex flex-col gap-2">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}

export function PeopleTabSkeleton() {
    return (
        <div className="w-full">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-8 w-28" />
                    <div className="grid gap-4 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <MemberSkeleton key={i} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <MemberSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function ClassDetailTabSkeleton({
    activeTab,
}: {
    activeTab: "stream" | "classwork" | "quizzes" | "gradebook" | "people"
}) {
    if (activeTab === "classwork") return <ClassworkTabSkeleton />
    if (activeTab === "quizzes") return <QuizTabSkeleton />
    if (activeTab === "gradebook") return <GradebookTabSkeleton />
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
        <div className="flex flex-col gap-6">
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                </div>
                <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            <div className="grid h-[calc(100dvh-14rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
                <div className="flex flex-col border-r border-hairline/70 bg-surface-subtle/30 p-3 space-y-2">
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <div className="space-y-1.5 pt-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl p-3 bg-card/60">
                                <Skeleton className="size-10 rounded-full shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                    <Skeleton className="h-3 w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden items-center justify-center p-8 md:flex">
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="size-16 rounded-2xl" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function MessagesContentSkeleton() {
    return (
        <div className="grid h-[calc(100dvh-14rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="flex flex-col border-r border-hairline/70 bg-surface-subtle/30 p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-28 rounded-xl" />
                </div>
                <Skeleton className="h-9 w-full rounded-xl" />
                <div className="space-y-1.5 pt-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-3 bg-card/60">
                            <Skeleton className="size-10 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden items-center justify-center p-8 md:flex">
                <div className="flex flex-col items-center gap-3">
                    <Skeleton className="size-16 rounded-2xl" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>
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

            <SettingsBodySkeleton />
        </div>
    )
}

export function SettingsBodySkeleton() {
    return (
        <div className="flex flex-col gap-8">
            {/* Horizontal Tabs Skeleton */}
            <div className="border-b">
                <div className="flex gap-4 px-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="px-4 py-3 border-b-2 border-transparent">
                            <Skeleton className="h-5 w-24" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area Skeleton (Profile Style) */}
            <div className="space-y-6">
                <Card className="border-border/50">
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
    )
}

export function CalendarSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="overflow-hidden rounded-xl bg-card">
                            <Skeleton className="h-8 w-full rounded-none" />
                            <div className="space-y-2 p-3">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <Skeleton key={j} className="h-10 w-full rounded-md" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

/**
 * Generic dashboard skeleton - kept for backwards compatibility.
 * Use role-specific skeletons for new dashboard.
 */
export function DashboardOverviewSkeleton() {
    return (
        <div className="space-y-6">
            <DashboardHeaderSkeleton />
            <Skeleton className="h-56 rounded-[var(--radius-container)]" />
            <div className="space-y-3">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-44 rounded-[var(--radius-container)]" />
            </div>
        </div>
    )
}

/**
 * Shared dashboard header skeleton used across all role-specific skeletons.
 */
function DashboardHeaderSkeletonInternal() {
    return (
        <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
            <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-64 max-w-full" />
                <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
            <Skeleton className="h-10 w-36 rounded-[var(--radius-control)]" />
        </div>
    )
}

/**
 * Admin dashboard skeleton matching the new admin composition.
 */
export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            {/* Organization operations stat cards */}
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-[var(--radius-container)]" />
                    ))}
                </div>
                <Skeleton className="h-10 rounded-[var(--radius-container)]" />
            </div>

            {/* 2-column Bento Grid: Primary + Rail */}
            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                {/* Primary Column */}
                <div className="space-y-6 sm:space-y-8">
                    {/* Attention queue */}
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />

                    {/* Workspace shortcuts */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-[var(--radius-container)]" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Intelligence & Activity Rail */}
                <div className="space-y-6 sm:space-y-8">
                    {/* AI cue */}
                    <Skeleton className="h-48 rounded-[var(--radius-container)]" />

                    {/* Activity */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                        <Skeleton className="h-56 rounded-[var(--radius-container)]" />
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Teacher dashboard skeleton matching the new teacher composition.
 */
export function TeacherDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            {/* Metrics strip */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-7">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                        <Skeleton className="h-8 w-10" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>

            {/* Teaching queue + rail */}
            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                {/* Queue */}
                <Skeleton className="h-96 rounded-[var(--radius-container)]" />

                {/* Rail: deadlines + AI cue */}
                <div className="space-y-4 sm:space-y-5">
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />
                    <Skeleton className="h-36 rounded-[var(--radius-container)]" />
                </div>
            </div>

            {/* Student check-ins */}
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-52" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-[var(--radius-container)]" />
                    ))}
                </div>
            </div>

            {/* Classes */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-48 rounded-[var(--radius-container)]" />
            </div>

            {/* Activity */}
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-56 rounded-[var(--radius-container)]" />
            </div>
        </div>
    )
}

/**
 * Student dashboard skeleton matching the new student composition.
 */
export function StudentDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            {/* Next action */}
            <Skeleton className="h-44 rounded-[var(--radius-container)]" />

            {/* Attention queue + rail */}
            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                {/* Queue */}
                <Skeleton className="h-80 rounded-[var(--radius-container)]" />

                {/* Rail: timeline + AI cue */}
                <div className="space-y-4 sm:space-y-5">
                    <Skeleton className="h-72 rounded-[var(--radius-container)]" />
                    <Skeleton className="h-36 rounded-[var(--radius-container)]" />
                </div>
            </div>

            {/* Feedback & messages */}
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />
                </div>
            </div>

            {/* Classes */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-48 rounded-[var(--radius-container)]" />
            </div>

            {/* Activity */}
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-56 rounded-[var(--radius-container)]" />
            </div>
        </div>
    )
}

export function DashboardActivitySkeleton() {
    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <Skeleton className="h-[22rem] rounded-xl xl:col-span-8" />
                <Skeleton className="h-[22rem] rounded-xl xl:col-span-4" />
            </div>
        </div>
    )
}

export function ActivityPageSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
                <Skeleton className="h-40 rounded-[var(--radius-container)] lg:col-span-1" />
                <Skeleton className="h-40 rounded-[var(--radius-container)] lg:col-span-2" />
            </div>
            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

export function ProfilePageSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="overflow-hidden rounded-[var(--radius-floating)] bg-card">
                <Skeleton className="h-40 w-full sm:h-48" />
                <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
                    <div className="flex items-end gap-4">
                        <Skeleton className="size-24 rounded-full border-4 border-card sm:-mt-8 sm:size-28" />
                        <div className="space-y-2 pb-1">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24 rounded-md" />
                        <Skeleton className="h-9 w-20 rounded-md" />
                    </div>
                </div>
            </div>
            <ProfileBodySkeleton />
        </div>
    )
}

export function ProfileBodySkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-hairline sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2 bg-card px-5 py-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-12" />
                    </div>
                ))}
            </div>
            <div className="flex gap-4 border-b border-hairline pb-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-[var(--radius-container)]" />
                ))}
            </div>
        </div>
    )
}

export function ResourceDetailSkeleton() {
    return (
        <div className="space-y-7 pb-10">
            {/* Breadcrumb row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="size-3.5 rounded" />
                    <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
            </div>

            {/* Hero block */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <Skeleton className="size-14 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 max-w-full" />
                    </div>
                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Skeleton className="h-7 w-28 rounded-lg" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-7 w-20 rounded-lg" />
                        <Skeleton className="h-7 w-24 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Full-width preview */}
            <div className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
                <div className="flex items-center justify-between border-b border-hairline/70 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="size-4 rounded" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                </div>
                <Skeleton className="w-full rounded-none" style={{ height: "70vh", minHeight: "28rem" }} />
            </div>
        </div>
    )
}

export function MessagesDetailSkeleton() {
    return (
        <div className="flex h-[calc(100dvh-10rem)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <div className="flex items-center gap-3 border-b border-hairline/70 bg-card/90 px-4 py-3.5 sm:px-6">
                <Skeleton className="size-8 rounded-xl md:hidden" />
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="flex-1 space-y-4 overflow-hidden bg-surface-subtle/30 p-4 sm:p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                    >
                        <Skeleton
                            className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-2/3 sm:w-1/2 rounded-br-xs" : "w-1/2 sm:w-1/3 rounded-bl-xs"}`}
                        />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 border-t border-hairline/70 bg-card/90 p-3 sm:px-4">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="size-10 rounded-xl" />
            </div>
        </div>
    )
}

export function WhiteboardSkeleton() {
    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-card px-4 py-2.5">
                <div className="flex items-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="size-9 rounded-md" />
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="size-6 rounded-full" />
                    ))}
                </div>
            </div>
            <Skeleton className="flex-1 rounded-xl" />
        </div>
    )
}

export function QuizTakingSkeleton() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-2/3" />
                <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </div>
            <div className="panel space-y-6 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md" />
            </div>
        </div>
    )
}

export function AdminPageSkeleton() {
    return (
        <div className="mx-auto w-full max-w-[88rem] space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <Skeleton className="hidden size-14 rounded-2xl sm:block" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-full max-w-md" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-32 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-md" />
                </div>
            </div>

            <AdminBodySkeleton />
        </div>
    )
}

export function AdminBodySkeleton() {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-hairline sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2 bg-card px-5 py-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                ))}
            </div>

            <div className="panel space-y-4 p-5 sm:p-6">
                <Skeleton className="h-4 w-32" />
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex gap-4 border-b border-hairline pb-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-4 w-24" />
                    ))}
                </div>
                <div className="panel overflow-hidden p-0">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0"
                        >
                            <Skeleton className="size-8 rounded-lg" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
