"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import {
    ArrowRight,
    Users,
    GraduationCap,
    Plus,
    BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

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

function ClassCard({ classItem }: { classItem: ClassItem }) {
    return (
        <Link href={`/home/classes/${classItem.id}`}>
            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md bg-card ring-1 ring-border/50">
                {/* Thumbnail or Color Banner */}
                <div
                    className="h-28 relative overflow-hidden"
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

                <CardContent className="p-4">
                    {classItem.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mb-4 leading-relaxed">
                            {classItem.description}
                        </p>
                    )}
                    {!classItem.description && (
                        <div className="min-h-[2.5em] mb-4" />
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
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
}

export function RecentClasses({ classes, userRole }: RecentClassesProps) {
    return (
        <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-card to-muted/20">
            <CardHeader className="py-4 px-6 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-lg font-semibold tracking-tight">Your Classes</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                        <Link href="/home/classes">
                            View all
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {classes.length === 0 ? (
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
                            <Link href="/home/classes">
                                <Plus className="h-5 w-5 mr-2" />
                                {userRole === "teacher" ? "Create Your First Class" : "Join a Class"}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.slice(0, 6).map((classItem) => (
                            <ClassCard key={classItem.id} classItem={classItem} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
