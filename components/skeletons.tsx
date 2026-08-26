import { Skeleton } from "@/components/ui/skeleton"
import { ClassDetailLayout } from "@/components/classes/class-detail-layout"
import { PageContainer } from "@/components/ui/section"

/* -------------------------------------------------------------------------- */
/* AI assistant chat                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors `ChatThread` (page variant): centered max-w-2xl bottom-anchored
 * column with the empty-state hero plus suggestion rows, and the persistent
 * composer card pinned at the bottom. Fills the full-bleed height wrapper
 * rendered by the route.
 */
export function AiChatThreadSkeleton() {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
                <div className="mx-auto flex w-full max-w-2xl flex-col justify-end gap-5 px-4 pb-4 pt-6">
                    <div className="space-y-5">
                        <Skeleton className="h-7 w-52 sm:h-8 sm:w-64" />
                        <div className="flex flex-col gap-3">
                            {[160, 224, 192, 144].map((width, index) => (
                                <div key={index} className="flex items-center gap-2.5">
                                    <Skeleton className="size-4 shrink-0 rounded" />
                                    <Skeleton className="h-4 rounded" style={{ width: `${width}px` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mx-auto w-full max-w-2xl shrink-0 px-4 pb-5 pt-1">
                <div className="rounded-2xl border border-hairline/80 bg-card p-2 shadow-e2">
                    <Skeleton className="mx-1 mt-1 h-6 w-3/4 rounded-md" />
                    <div className="flex items-center justify-between gap-1 px-1 pt-2">
                        <div className="flex items-center gap-1.5">
                            <Skeleton className="size-7 rounded-lg" />
                            <Skeleton className="size-7 rounded-lg" />
                        </div>
                        <Skeleton className="size-7 rounded-lg bg-sky-500/30" />
                    </div>
                </div>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Announcements / stream tab                                                 */
/* -------------------------------------------------------------------------- */

export function AnnouncementSkeleton() {
    return (
        <div className="rounded-2xl border border-hairline/80 bg-card p-5 shadow-e1">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <Skeleton className="size-7 rounded-md" />
            </div>
            <div className="space-y-2 py-3.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-[70%]" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-6 w-10 rounded-md" />
            </div>
        </div>
    )
}

export function StreamTabSkeleton() {
    return (
        <div className="w-full space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-hairline/80 bg-card p-4 shadow-e1">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <AnnouncementSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                    */
/* -------------------------------------------------------------------------- */

export function ClassCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <div className="relative h-36 w-full shrink-0">
                <Skeleton className="h-full w-full rounded-none" />
                <Skeleton className="absolute top-3 left-3 h-5 w-20 rounded-md" />
                <Skeleton className="absolute bottom-3 left-3 size-8 rounded-lg" />
                <Skeleton className="absolute right-3 bottom-3 size-8 rounded-lg" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Skeleton className="h-[22px] w-16 rounded-md" />
                    <Skeleton className="h-[22px] w-12 rounded-md" />
                    <Skeleton className="h-[22px] w-20 rounded-md" />
                </div>
            </div>
            <div className="flex items-center gap-2 border-t border-hairline/70 bg-surface-subtle/30 px-4 py-3">
                <div className="flex items-center">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="-ml-1.5 size-5 rounded-full ring-2 ring-card first:ml-0" />
                    ))}
                </div>
                <Skeleton className="h-3 w-24" />
            </div>
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

/**
 * Body fallback for `/classes`. Auth-dependent header actions and search
 * controls land with the data, so the heading block, filter bar, and grid
 * placeholder are faked here while the session resolves.
 */
export function ClassesBodySkeleton() {
    return (
        <div className="w-full space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <div className="flex gap-2.5">
                    <Skeleton className="h-9 w-24 rounded-[var(--radius-buttons)]" />
                    <Skeleton className="h-9 w-32 rounded-[var(--radius-buttons)]" />
                </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-hairline/80 bg-card/80 p-2 shadow-2xs backdrop-blur-xs sm:p-2.5 lg:flex-row lg:items-center">
                <Skeleton className="h-10 w-full rounded-lg bg-surface/50 lg:max-w-md" />
                <Skeleton className="hidden h-6 w-16 rounded-md bg-surface/60 lg:ml-auto lg:block" />
                <Skeleton className="h-10 w-full rounded-lg bg-surface/50 sm:max-w-[9.5rem]" />
            </div>
            <ClassesGridSkeleton />
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Class detail                                                               */
/* -------------------------------------------------------------------------- */

export function ClassDetailHeroSkeleton() {
    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-e1">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                <Skeleton className="size-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-2/3" />
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-6 w-14 rounded-md" />
                        <Skeleton className="h-6 w-24 rounded-md" />
                        <Skeleton className="h-6 w-28 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <Skeleton className="h-7 w-24 rounded-lg" />
                    <Skeleton className="size-9 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function ClassDetailNavSkeleton() {
    return (
        <div className="mt-4 flex items-center justify-between gap-3 border-b border-hairline">
            <div className="scroll-x-region flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-px">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-md" />
                ))}
            </div>
            <Skeleton className="hidden h-9 w-32 shrink-0 rounded-lg sm:block" />
        </div>
    )
}

export function ClassDetailRailSkeleton() {
    return (
        <div className="flex w-full flex-col gap-4 lg:gap-5">
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="border-b border-hairline px-4 py-3.5">
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex flex-col gap-3 p-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="size-8 shrink-0 rounded-lg" />
                            <div className="w-full min-w-0 space-y-1.5">
                                <Skeleton className="h-3.5 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-hairline p-4 pt-3">
                    <Skeleton className="h-9 w-full rounded-lg" />
                </div>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="border-b border-hairline px-4 py-3.5">
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}

export function ClassDetailSkeleton() {
    return (
        <ClassDetailLayout
            hero={<ClassDetailHeroSkeleton />}
            navigation={<ClassDetailNavSkeleton />}
            rail={<ClassDetailRailSkeleton />}
        >
            <StreamTabSkeleton />
        </ClassDetailLayout>
    )
}

/* -------------------------------------------------------------------------- */
/* Classwork tab                                                              */
/* -------------------------------------------------------------------------- */

export function ClassworkCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
            <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-start gap-3">
                    <Skeleton className="mt-0.5 size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-44 max-w-full" />
                        <Skeleton className="h-3 w-56 max-w-full" />
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="size-7 rounded-md" />
                </div>
            </div>
            <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <Skeleton className="h-4 w-3/4 max-w-full" />
                <div className="flex items-center justify-between border-t border-hairline pt-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export function ClassworkTabSkeleton() {
    return (
        <div className="w-full space-y-4">
            <div className="flex justify-end">
                <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <ClassworkCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Quizzes tab                                                                */
/* -------------------------------------------------------------------------- */

export function QuizCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
            <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-start gap-3">
                    <Skeleton className="mt-0.5 size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-44 max-w-full" />
                        <Skeleton className="h-3 w-52 max-w-full" />
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Skeleton className="h-6 w-14 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="size-7 rounded-md" />
                </div>
            </div>
            <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <Skeleton className="h-4 w-2/3 max-w-full" />
                <div className="flex items-center justify-between border-t border-hairline pt-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export function QuizTabSkeleton() {
    return (
        <div className="w-full space-y-4">
            <div className="flex justify-end">
                <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <QuizCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Gradebook tab                                                              */
/* -------------------------------------------------------------------------- */

export function GradebookTabSkeleton() {
    return (
        <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
            <div className="flex items-center gap-3 border-b border-hairline bg-surface-subtle/50 px-4 py-2.5 sm:px-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto hidden h-4 w-16 sm:block" />
                <Skeleton className="hidden h-4 w-16 sm:block" />
                <Skeleton className="hidden h-4 w-16 md:block" />
                <Skeleton className="h-4 w-14" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-t border-hairline px-4 py-3 sm:px-5">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32 max-w-[40%]" />
                    <Skeleton className="ml-auto h-6 w-10 rounded-md" />
                    <Skeleton className="h-6 w-10 rounded-md" />
                    <Skeleton className="hidden h-6 w-10 rounded-md md:block" />
                    <Skeleton className="h-4 w-10" />
                </div>
            ))}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* People tab                                                                 */
/* -------------------------------------------------------------------------- */

export function MemberSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-48 max-w-full" />
            </div>
        </div>
    )
}

function MemberPanelSkeleton({
    titleWidth,
    rowCount,
}: {
    titleWidth: string
    rowCount: number
}) {
    return (
        <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5">
                <div className="min-w-0 space-y-1">
                    <Skeleton className={`h-5 ${titleWidth}`} />
                    <Skeleton className="h-3 w-40 max-w-full" />
                </div>
                <Skeleton className="h-5 w-8 shrink-0 rounded-full" />
            </div>
            <div className="divide-y divide-hairline">
                {Array.from({ length: rowCount }).map((_, i) => (
                    <MemberSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export function PeopleTabSkeleton() {
    return (
        <div className="w-full space-y-4">
            <MemberPanelSkeleton titleWidth="w-20" rowCount={2} />
            <MemberPanelSkeleton titleWidth="w-20" rowCount={5} />
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

/* -------------------------------------------------------------------------- */
/* Quiz taking                                                                */
/* -------------------------------------------------------------------------- */

export function QuizTakingSkeleton() {
    return (
        <div className="mx-auto w-full max-w-[72rem] space-y-4 py-6 sm:space-y-5 sm:py-8">
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-7 w-2/3 max-w-full" />
                            <Skeleton className="h-4 w-96 max-w-full" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>
            </div>

            <div className="flex items-center justify-between rounded-[var(--radius-container)] border border-hairline bg-card px-4 py-3.5 sm:px-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="border-b border-hairline bg-surface-subtle/60 px-4 py-3.5 sm:px-5">
                    <Skeleton className="mb-1.5 h-2.5 w-16" />
                    <Skeleton className="h-5 w-3/4 max-w-full" />
                </div>
                <div className="space-y-2.5 p-4 sm:p-5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Whiteboard                                                                 */
/* -------------------------------------------------------------------------- */

export function WhiteboardSkeleton() {
    return (
        <div className="w-full space-y-3">
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-lg" />
                        <div className="min-w-0 space-y-1">
                            <Skeleton className="h-2.5 w-24" />
                            <Skeleton className="h-5 w-48 max-w-full" />
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <div className="flex -space-x-1.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="size-6 rounded-full ring-2 ring-card" />
                            ))}
                        </div>
                    </div>
                </div>
                <Skeleton
                    className="w-full rounded-none"
                    style={{ height: "calc(100dvh - 18rem)", minHeight: "28rem" }}
                />
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

export function NotificationsContentSkeleton() {
    return (
        <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
                <div className="min-w-0 space-y-1">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-3 w-52 max-w-full" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
            </div>
            <div className="divide-y divide-hairline">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${i < 2 ? "bg-primary-surface/40" : ""}`}
                    >
                        <Skeleton className={`mt-0.5 size-8 shrink-0 rounded-lg ${i < 2 ? "bg-primary/25" : ""}`} />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-40 max-w-full" />
                                {i < 2 ? <Skeleton className="size-2 shrink-0 rounded-full" /> : null}
                            </div>
                            <Skeleton className="h-3 w-3/4 max-w-full" />
                            <Skeleton className="h-2.5 w-16" />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <Skeleton className="h-5 w-14 rounded-full" />
                            {i < 2 ? <Skeleton className="size-7 rounded-md" /> : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

export function MessagesContentSkeleton() {
    return (
        <div className="grid h-[calc(100dvh-14rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col">
                <div className="space-y-2.5 border-b border-hairline/70 bg-card/60 p-4 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-14" />
                            <Skeleton className="h-5 w-10 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-48 max-w-full" />
                    <div className="relative">
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl p-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className={`size-10 shrink-0 ${i % 3 === 0 ? "rounded-lg" : "rounded-full"}`} />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Skeleton className="h-4 w-28 max-w-full" />
                                        <Skeleton className="h-3 w-10 shrink-0" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <Skeleton className="h-3 w-3/4 max-w-full" />
                                        {i < 2 ? <Skeleton className="h-5 w-6 shrink-0 rounded-full" /> : null}
                                    </div>
                                    <Skeleton className="h-2.5 w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden items-center justify-center p-8 md:flex">
                <div className="flex flex-col items-center gap-3">
                    <Skeleton className="size-16 rounded-2xl" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                    <Skeleton className="mt-3 h-9 w-40 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

/**
 * Thread fallback shared by direct messages and class channels.
 * `variant="channel"` renders the square class avatar, channel badge chip,
 * longer description line, and sender labels above incoming bubbles.
 */
export function MessagesDetailSkeleton({
    variant = "direct",
}: {
    variant?: "direct" | "channel"
}) {
    const isChannel = variant === "channel"
    return (
        <div className="flex h-[calc(100dvh-10rem)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <div className="flex items-center gap-3 border-b border-hairline/70 bg-card/90 px-4 py-3.5 sm:px-6">
                <Skeleton className="size-8 shrink-0 rounded-xl md:hidden" />
                <Skeleton
                    className={`size-10 shrink-0 ${isChannel ? "rounded-lg" : "rounded-full"}`}
                />
                <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-36 max-w-full" />
                        {isChannel ? <Skeleton className="h-5 w-24 rounded-full" /> : null}
                    </div>
                    {isChannel ? (
                        <Skeleton className="h-3 w-52 max-w-full" />
                    ) : (
                        <Skeleton className="h-3 w-20" />
                    )}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden bg-surface-subtle/30 px-4 py-5 sm:px-6">
                <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-end gap-3.5">
                    <div className="flex justify-center">
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-11 w-2/3 rounded-2xl rounded-br-xs sm:w-1/2" />
                    </div>
                    <div className="flex justify-start">
                        <div className="min-w-0 space-y-1 pl-11">
                            {isChannel ? <Skeleton className="h-2.5 w-20" /> : null}
                            <Skeleton className="h-12 w-1/2 rounded-2xl rounded-bl-xs sm:w-1/3" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <div className="flex flex-col items-end gap-1">
                            <Skeleton className="h-11 w-2/3 rounded-2xl rounded-br-xs sm:w-1/2" />
                            <Skeleton className="h-2.5 w-14" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="safe-bottom flex items-center gap-2 border-t border-hairline/70 bg-card/90 p-3 sm:px-4">
                <Skeleton className={`${isChannel ? "size-9 rounded-xl" : "size-10 rounded-lg"} shrink-0`} />
                <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
                <Skeleton className="size-10 shrink-0 rounded-lg" />
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Body fallback for `/resources`. Mirrors `ResourcesPageShell`: wide
 * container, heading block, and toolbar contents while the session resolves;
 * the grid then streams behind its own inner boundary.
 */
export function ResourcesBodySkeleton() {
    return (
        <div className="mx-auto w-full max-w-[88rem] space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-9 w-24 rounded-[var(--radius-buttons)]" />
            </div>
            <div
                data-slot="filter-toolbar"
                role="search"
                aria-label="Resource filters"
                className="flex flex-col gap-3 rounded-xl border border-hairline/80 bg-card/80 p-2 shadow-2xs backdrop-blur-xs sm:p-2.5 lg:flex-row lg:items-center"
            >
                <Skeleton className="h-9 w-full rounded-lg bg-surface/50 pl-9 sm:max-w-72" />
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 py-0.5">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="h-9 rounded-lg"
                            style={{ width: `${52 + ((i * 13) % 40)}px` }}
                        />
                    ))}
                </div>
                <div className="flex shrink-0 items-center sm:ml-auto">
                    <Skeleton className="h-9 w-[8.75rem] rounded-lg bg-surface/40" />
                </div>
            </div>
            <ResourcesGridSkeleton />
        </div>
    )
}

export function ResourceCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
            <div className="flex h-32 w-full items-center justify-center">
                <Skeleton className="h-24 w-36 rounded-lg" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                <div className="space-y-1.5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Skeleton className="h-[22px] w-16 rounded-md" />
                    <Skeleton className="h-[22px] w-14 rounded-md" />
                    <Skeleton className="h-[22px] w-12 rounded-md" />
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-hairline/70 bg-surface-subtle/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="size-7 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export function ResourcesGridSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <ResourceCardSkeleton key={i} />
            ))}
        </div>
    )
}

export function ResourceDetailSkeleton() {
    return (
        <div className="w-full space-y-0 pb-10">
            <div className="mb-5 flex items-center justify-end py-1 sm:mb-7">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="size-9 rounded-lg" />
                </div>
            </div>

            <div className="mb-5 flex flex-col gap-5 sm:mb-7 sm:flex-row sm:items-start sm:gap-6">
                <Skeleton className="size-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-2/3 max-w-full" />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 sm:mb-7">
                <div className="flex items-center justify-between gap-3 border-b border-hairline/70 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Skeleton className="size-4 shrink-0 rounded" />
                        <Skeleton className="h-4 w-40 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                </div>
                <Skeleton
                    className="w-full rounded-none"
                    style={{ height: "calc(100dvh - 20rem)", minHeight: "24rem" }}
                />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="overflow-hidden rounded-2xl border border-hairline/80 bg-card"
                        >
                            <Skeleton className="h-16 w-full rounded-none" />
                            <div className="space-y-1.5 p-3">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Learn                                                                      */
/* -------------------------------------------------------------------------- */

export function LearnPageSkeleton() {
    return (
        <PageContainer width="content" className="py-6 sm:py-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-7 w-36" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <Skeleton className="h-9 w-24 rounded-[var(--radius-buttons)]" />
            </div>
            <div className="mt-6 mb-4 rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="size-5 shrink-0 rounded" />
                        <div className="min-w-0 space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-72 max-w-full" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-36 rounded-lg" />
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-[var(--radius-container)] border border-hairline bg-card p-5"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                            <Skeleton className="size-4 shrink-0" />
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-14" />
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    )
}

export function StudySpaceSkeleton() {
    return (
        <PageContainer width="content" className="py-6 sm:py-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Skeleton className="h-9 w-28 rounded-lg" />
                    <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
            </div>
            <div className="mt-6 flex gap-4 border-b border-hairline pb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-20 shrink-0" />
                ))}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-[var(--radius-container)] border border-hairline bg-card p-4"
                    >
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="mt-2 h-8 w-12" />
                    </div>
                ))}
            </div>
        </PageContainer>
    )
}

export function StudyReviewSkeleton() {
    return (
        <PageContainer width="narrow" className="py-6 sm:py-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                </div>
                <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />
            </div>
            <div className="mt-6 overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
                <div className="p-4 sm:p-5">
                    <Skeleton
                        className="min-h-64 w-full rounded-xl bg-primary-surface"
                        style={{ height: "16rem" }}
                    />
                    <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    )
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Body fallback for `/calendar`. The page shell (container + heading) renders
 * above this boundary.
 */
export function CalendarBodySkeleton() {
    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
            <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                <div className="border-b border-hairline px-3.5 pb-2.5 pt-3.5">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                    <section key={i}>
                        <div className="flex items-center gap-2 bg-surface/60 px-4 py-2">
                            <Skeleton className="h-2.5 w-24" />
                            <Skeleton className="h-2.5 w-4" />
                        </div>
                        <div className="divide-y divide-hairline">
                            {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
                                <div key={j} className="flex items-center gap-2.5 px-4 py-3 sm:gap-3">
                                    <Skeleton className="size-2.5 shrink-0 rounded-full" />
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-2/5 max-w-full" />
                                        <Skeleton className="h-3 w-1/4 max-w-full" />
                                    </div>
                                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <aside className="flex w-full flex-col gap-4 lg:gap-5">
                <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                    <div className="border-b border-hairline px-3.5 pb-2.5 pt-3.5">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="mt-1.5 h-3 w-44 max-w-full" />
                    </div>
                    <div className="divide-y divide-hairline">
                        {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3">
                                <Skeleton className="size-2.5 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1 space-y-1">
                                    <Skeleton className="h-3.5 w-3/4 max-w-full" />
                                    <Skeleton className="h-2.5 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                    <div className="border-b border-hairline px-3.5 pb-2.5 pt-3.5">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="mt-1.5 h-3 w-52 max-w-full" />
                    </div>
                    <div className="p-4">
                        <Skeleton className="h-9 w-full rounded-[var(--radius-buttons)]" />
                    </div>
                </div>
            </aside>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Dashboards                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generic dashboard skeleton used only for the outer auth/membership boundary
 * before the role resolves. The inner view-model boundary uses the
 * role-specific skeletons below.
 */
export function DashboardOverviewSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 rounded-[var(--radius-container)] border border-hairline bg-card p-4 sm:p-5"
                    >
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-7 w-10" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                <div className="space-y-6 sm:space-y-8">
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />
                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-[var(--radius-container)]" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 sm:space-y-8">
                    <Skeleton className="h-48 rounded-[var(--radius-container)]" />
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
 * Shared dashboard header skeleton matching `DashboardHeader`
 * (date row + display title + subtitle + primary action over a hairline rule).
 */
function DashboardHeaderSkeletonInternal() {
    return (
        <header className="flex flex-col gap-4 border-b border-hairline/80 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-6">
            <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-64 max-w-full" />
                <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
            <Skeleton className="h-10 w-full shrink-0 rounded-[var(--radius-buttons)] sm:w-auto sm:max-w-44" />
        </header>
    )
}

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 rounded-[var(--radius-container)] border border-hairline bg-card p-4 sm:p-5"
                    >
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-7 w-10" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                <div className="space-y-6 sm:space-y-8">
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />

                    <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-[var(--radius-container)]" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 sm:space-y-8">
                    <Skeleton className="h-48 rounded-[var(--radius-container)]" />

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

export function TeacherDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            <div className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-7">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                        <Skeleton className="h-8 w-10" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>

            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                <Skeleton className="h-96 rounded-[var(--radius-container)]" />

                <div className="space-y-4 sm:space-y-5">
                    <Skeleton className="h-64 rounded-[var(--radius-container)]" />
                    <Skeleton className="h-36 rounded-[var(--radius-container)]" />
                </div>
            </div>

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

export function StudentDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
            <DashboardHeaderSkeletonInternal />

            <Skeleton className="h-44 rounded-[var(--radius-container)]" />

            <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
                <Skeleton className="h-80 rounded-[var(--radius-container)]" />

                <div className="space-y-4 sm:space-y-5">
                    <Skeleton className="h-72 rounded-[var(--radius-container)]" />
                    <Skeleton className="h-36 rounded-[var(--radius-container)]" />
                </div>
            </div>

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

/* -------------------------------------------------------------------------- */
/* Organization admin                                                         */
/* -------------------------------------------------------------------------- */

export function AdminBodySkeleton() {
    return (
        <div className="flex flex-col gap-6 pb-safe-bottom sm:gap-8">
            <div className="flex items-start gap-4">
                <Skeleton className="hidden size-12 shrink-0 rounded-xl sm:block" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-56 max-w-full" />
                    <Skeleton className="h-4 w-80 max-w-full" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
                </div>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="flex flex-col gap-2 rounded-[var(--radius-cards)] border border-hairline bg-card px-3 py-2.5"
                            >
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-7 w-10" />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 overflow-x-auto border-b border-hairline pb-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-4 w-24 shrink-0" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Skeleton className="h-9 w-full rounded-lg sm:max-w-xs" />
                        <Skeleton className="hidden h-4 w-16 sm:ml-auto sm:block" />
                    </div>

                    <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                        <div className="flex items-center gap-4 border-b border-hairline bg-surface-subtle/50 px-4 py-2.5 sm:px-5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="hidden h-3 w-20 md:block" />
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className="ml-auto hidden h-3 w-14 lg:block" />
                            <Skeleton className="h-3 w-10" />
                        </div>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0 sm:px-5"
                            >
                                <Skeleton className="size-8 shrink-0 rounded-lg" />
                                <div className="min-w-0 space-y-1">
                                    <Skeleton className="h-3.5 w-28 max-w-full" />
                                    <Skeleton className="h-2.5 w-36 max-w-full md:hidden" />
                                </div>
                                <Skeleton className="ml-auto h-5 w-16 shrink-0 rounded-full" />
                                <Skeleton className="hidden h-3 w-16 md:block" />
                                <Skeleton className="hidden h-3 w-16 lg:block" />
                                <Skeleton className="size-8 shrink-0 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>

                <aside className="self-start overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card lg:sticky lg:top-2">
                    <div className="flex flex-col gap-1.5 border-b border-hairline px-4 py-3.5">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-40 max-w-full" />
                    </div>
                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-3 w-10" />
                            <Skeleton className="h-9 w-full rounded-lg" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-9 w-full rounded-lg" />
                            <Skeleton className="h-2.5 w-full" />
                            <Skeleton className="h-2.5 w-3/4" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-[var(--radius-buttons)]" />
                    </div>
                </aside>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export function SettingsBodySkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex gap-4 overflow-x-auto border-b border-hairline pb-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-4 w-20 shrink-0" />
                        ))}
                    </div>
                    <div className="overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card">
                        <div className="flex flex-col gap-2 border-b border-hairline px-4 py-3.5 sm:px-5">
                            <Skeleton className="h-5 w-40 rounded" />
                            <Skeleton className="h-3 w-56 max-w-full rounded" />
                        </div>
                        <div className="flex flex-col gap-6 p-4 sm:p-5">
                            <div className="flex flex-col gap-4 rounded-[var(--radius-cards)] bg-surface-subtle p-4 sm:flex-row sm:items-center">
                                <Skeleton className="size-14 shrink-0 rounded-2xl" />
                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    <Skeleton className="h-4 w-28 rounded" />
                                    <Skeleton className="h-3 w-48 max-w-full rounded" />
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Skeleton className="h-8 w-20 rounded-md" />
                                    <Skeleton className="h-8 w-16 rounded-md" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full rounded-md" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-24 w-full rounded-md" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-10 w-full rounded-md opacity-60" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-hairline px-4 py-3">
                            <Skeleton className="h-9 w-28 rounded-[var(--radius-buttons)]" />
                        </div>
                    </div>
                </div>

                <aside className="self-start overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card lg:sticky lg:top-2">
                    <div className="flex flex-col gap-1.5 border-b border-hairline px-4 py-3.5">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-40 max-w-full" />
                    </div>
                    <div className="flex items-center gap-3 p-4">
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-3 w-40 max-w-full rounded" />
                            <div className="flex items-center gap-2 pt-0.5">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-2.5 w-24" />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* User profile                                                               */
/* -------------------------------------------------------------------------- */

export function ProfileBodySkeleton() {
    return (
        <div className="flex flex-col gap-5 sm:gap-6">
            <div className="shadow-e1 overflow-hidden rounded-[var(--radius-floating)] border border-hairline bg-card">
                <Skeleton className="h-28 w-full rounded-none sm:h-36" />
                <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:pb-7">
                    <div className="flex items-end gap-4">
                        <Skeleton className="-mt-12 size-24 shrink-0 rounded-full border-4 border-card shadow-e2 sm:-mt-16 sm:size-32" />
                        <div className="min-w-0 space-y-2 pb-1">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-7 w-40 max-w-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-56 max-w-full" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-28 shrink-0 rounded-[var(--radius-buttons)]" />
                </div>
                <div className="border-t border-hairline px-5 pt-5 pb-5 sm:px-7 sm:pb-7">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full max-w-xl" />
                        <Skeleton className="h-4 w-2/3 max-w-xl" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Skeleton className="h-6 w-28 rounded-full border border-hairline" />
                        <Skeleton className="h-6 w-32 rounded-full border border-hairline" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="space-y-1.5 rounded-[var(--radius-cards)] border border-hairline bg-card px-3 py-2.5"
                    >
                        <div className="flex items-center gap-1.5">
                            <Skeleton className="size-2 rounded-full" />
                            <Skeleton className="h-2.5 w-16" />
                        </div>
                        <Skeleton className="h-7 w-10" />
                    </div>
                ))}
            </div>

            <div className="flex gap-4 border-b border-hairline pb-3">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                ))}
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-3 rounded-xl border border-hairline/80 bg-card/80 p-2 shadow-2xs sm:flex-row sm:items-center">
                    <Skeleton className="h-9 w-full rounded-lg sm:max-w-64" />
                    <Skeleton className="hidden h-4 w-16 sm:ml-auto sm:block" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1"
                        >
                            <Skeleton className="h-16 w-full rounded-none" />
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
