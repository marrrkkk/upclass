"use client"

import { useMemo, useState, useSyncExternalStore, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePrefetch } from "@/hooks/use-prefetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    Users,
    GraduationCap,
    Plus,
    BookOpen
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    parseRecentClassVisitsSnapshot,
    getRecentClassVisitsServerSnapshot,
    getRecentClassVisitsSnapshot,
    sortItemsByRecentClassVisitSnapshot,
    subscribeToRecentClassVisits,
} from "@/lib/recent-class-visits"

export type ClassItem = {
    id: string
    title: string
    description?: string | null
    thumbnail?: string | null
    color: string
    category?: string | null
    memberCount: number
    role: "teacher" | "student"
}

type RecentClassesProps = {
    classes: ClassItem[]
    userRole: "teacher" | "student" | null
}

const ClassCard = memo(function ClassCard({ classItem }: { classItem: ClassItem }) {
    const { prefetchOnHover, cancelPrefetch } = usePrefetch()
    const classHref = `/classes/${classItem.id}`
    return (
        <Link 
            href={classHref} 
            prefetch={true}
            onMouseEnter={() => prefetchOnHover(classHref)}
            onMouseLeave={() => cancelPrefetch(classHref)}
        >
            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md bg-card ring-1 ring-border/50 h-full flex flex-col">
                {/* Thumbnail or Color Banner */}
                <div
                    className="h-28 relative overflow-hidden shrink-0"
                    style={{
                        backgroundColor: classItem.color,
                    }}
                >
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />

                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent z-0" />

                    {classItem.thumbnail && (
                        <Image
                            src={classItem.thumbnail}
                            alt={classItem.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    )}

                    {/* Class Type Badge */}
                    <div className="absolute top-3 right-3 z-20">
                        <Badge
                            variant="secondary"
                            className="bg-black/30 backdrop-blur-md text-white border-white/20 shadow-sm hover:bg-black/40 text-[10px] font-medium tracking-wide uppercase"
                        >
                            {classItem.role === "teacher" ? "Teaching" : "Enrolled"}
                        </Badge>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 z-20">
                        <h4 className="font-bold text-lg text-white truncate drop-shadow-sm leading-tight">
                            {classItem.title}
                        </h4>
                        {classItem.category && (
                            <p className="text-white/80 text-xs font-medium truncate mt-0.5">
                                {classItem.category}
                            </p>
                        )}
                    </div>
                </div>

                <CardContent className="p-4 flex flex-col flex-1">
                    {classItem.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mb-4 leading-relaxed">
                            {classItem.description}
                        </p>
                    ) : (
                        <div className="min-h-[2.5em] mb-4" />
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            <Users className="h-3.5 w-3.5" />
                            <span>{classItem.memberCount} Mbrs</span>
                        </div>

                        <div className="h-8 w-8 rounded-full bg-primary/5 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
})

function AllClassesDialog({ classes, userRole, open, onOpenChange }: {
    classes: ClassItem[],
    userRole: "teacher" | "student" | null,
    open: boolean,
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] w-full lg:max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-muted/5 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="h-5 w-5 text-primary" />
                        All Classes
                    </DialogTitle>
                    <DialogDescription>
                        {userRole === "teacher"
                            ? `You are teaching ${classes.length} classes.`
                            : `You are enrolled in ${classes.length} classes.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/5">
                    {classes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg font-medium">No classes found</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {classes.map((classItem) => (
                                <ClassCard key={classItem.id} classItem={classItem} />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function RecentClasses({ classes, userRole }: RecentClassesProps) {
    const [open, setOpen] = useState(false)
    const recentVisitsSnapshot = useSyncExternalStore(
        subscribeToRecentClassVisits,
        getRecentClassVisitsSnapshot,
        getRecentClassVisitsServerSnapshot,
    )
    const orderedClasses = useMemo(
        () => sortItemsByRecentClassVisitSnapshot(
            classes,
            parseRecentClassVisitsSnapshot(recentVisitsSnapshot),
            (classItem) => classItem.id,
        ),
        [classes, recentVisitsSnapshot],
    )

    return (
        <>
            <AllClassesDialog
                classes={orderedClasses}
                userRole={userRole}
                open={open}
                onOpenChange={setOpen}
            />
            <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-card to-muted/20">
                <CardHeader className="py-4 px-6 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-lg font-semibold tracking-tight">Your Classes</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(true)}
                        >
                            View all
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {orderedClasses.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500">
                                <GraduationCap className="h-10 w-10 text-muted-foreground opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight mb-2">No active classes</h3>
                            <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                                {userRole === "teacher"
                                    ? "You haven't created any classes yet. Start your teaching journey by creating your first class."
                                    : "You're not enrolled in any classes. Join a class to start learning."}
                            </p>
                            <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                                <Link href="/classes">
                                    <Plus className="h-5 w-5 mr-2" />
                                    {userRole === "teacher" ? "Create Your First Class" : "Join a Class"}
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orderedClasses.slice(0, 6).map((classItem) => (
                                <ClassCard key={classItem.id} classItem={classItem} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
