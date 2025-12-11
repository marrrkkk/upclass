import { Skeleton } from "@/components/ui/skeleton"

export default function MainLoading() {
    return (
        <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
            {/* Header Area */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Content Area */}
            <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-[150px] rounded-xl" />
                    <Skeleton className="h-[150px] rounded-xl" />
                    <Skeleton className="h-[150px] rounded-xl" />
                </div>
            </div>
        </div>
    )
}
