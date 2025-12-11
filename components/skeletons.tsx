import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

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
            <div className="flex flex-row gap-4 justify-start items-center">
                <div className="inline-flex p-1 bg-muted/40 rounded-xl border">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-72 rounded-xl" />
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
