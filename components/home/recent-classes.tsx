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
    Plus
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
            <Card className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group h-full",
                "border-t-4"
            )}
                style={{ borderTopColor: classItem.color }}
            >
                {/* Thumbnail or Color Banner */}
                <div
                    className="h-20 relative"
                    style={{
                        backgroundColor: classItem.thumbnail ? undefined : classItem.color,
                        backgroundImage: classItem.thumbnail ? `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)` : undefined
                    }}
                >
                    {classItem.thumbnail && (
                        <Image
                            src={classItem.thumbnail}
                            alt={classItem.title}
                            fill
                            className="object-cover"
                        />
                    )}

                    {/* Class Type Badge */}
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className="bg-background/80 backdrop-blur-sm text-xs"
                        >
                            {classItem.role === "teacher" ? "Teaching" : "Enrolled"}
                        </Badge>
                    </div>
                </div>

                <CardContent className="p-4 space-y-2">
                    <div className="space-y-1">
                        <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {classItem.title}
                        </h4>
                        {classItem.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {classItem.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{classItem.memberCount} {classItem.memberCount === 1 ? "member" : "members"}</span>
                        </div>

                        {classItem.category && (
                            <Badge variant="outline" className="text-xs">
                                {classItem.category}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export function RecentClasses({ classes, userRole }: RecentClassesProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Your Classes</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/home/classes">
                            View all
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {classes.length === 0 ? (
                    <Empty>
                        <EmptyMedia variant="icon">
                            <GraduationCap className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No classes yet</EmptyTitle>
                        <EmptyDescription>
                            {userRole === "teacher"
                                ? "Create your first class to get started"
                                : "Join a class using a class code"}
                        </EmptyDescription>
                        <EmptyContent>
                            <Button asChild>
                                <Link href="/home/classes">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {userRole === "teacher" ? "Create Class" : "Join Class"}
                                </Link>
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.slice(0, 6).map((classItem) => (
                            <ClassCard key={classItem.id} classItem={classItem} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
