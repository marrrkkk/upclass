"use client"

import { memo, useMemo } from "react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import type { ClassCardData } from "@/types/classes"

type ClassCardProps = {
  data: ClassCardData
  onHoverStart: (href: string) => void
  onHoverEnd: (href: string) => void
}

export const ClassCard = memo(function ClassCard({
  data,
  onHoverStart,
  onHoverEnd,
}: ClassCardProps) {
  const classColor = data.color || "#3b82f6"
  const classHref = `/classes/${data.id}`
  const teacherInitials = useMemo(() => {
    return data.teacherName
      ? data.teacherName
          .split(" ")
          .map((name) => name[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "T"
  }, [data.teacherName])

  return (
    <Link
      href={classHref}
      prefetch={true}
      onMouseEnter={() => onHoverStart(classHref)}
      onMouseLeave={() => onHoverEnd(classHref)}
      className="group block h-full"
    >
      <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
        <div
          className="relative h-28 w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${classColor} 0%, ${classColor}dd 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />

          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <div className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white shadow-sm border border-white/10">
              {data.enrolledCount} enrolled
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 pt-10 relative">
          <div className="absolute -top-7 left-5">
            <Avatar className="h-14 w-14 border-4 border-card shadow-sm">
              <AvatarImage src={data.teacherImage || undefined} alt={data.teacherName || "Teacher"} />
              <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1.5 mb-4">
            <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {data.title}
            </h3>
            {data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">
                {data.teacherName || "Unknown Teacher"}
              </span>
            </div>
            {data.category && (
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${classColor}10`,
                  color: classColor,
                }}
              >
                {data.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
})
