import Link from "next/link"
import { PenTool } from "lucide-react"

import { ClassDetailTeacherActions } from "@/components/classes/class-detail-teacher-actions"

import type { ClassData } from "@/types/classes"

type ClassDetailHeroProps = {
  classData: ClassData
  classColor: string
  userRole: "teacher" | "student" | null
}

export function ClassDetailHero({
  classData,
  classColor,
  userRole,
}: ClassDetailHeroProps) {
  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-8">
      <div
        className="relative w-full rounded-b-xl overflow-hidden shadow-sm flex flex-col justify-end min-h-[220px] sm:min-h-[260px] md:min-h-[300px]"
        style={{
          background: `linear-gradient(135deg, ${classColor} 0%, ${classColor}dd 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        <div className="relative z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 text-white">
          <div className="flex flex-col gap-6 items-start">
            <div className="space-y-3 w-full max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                {classData.category && (
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm border border-white/20">
                    {classData.category}
                  </span>
                )}
                {classData.schedule && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    {classData.schedule}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm text-left">
                {classData.title}
              </h1>
              {classData.description && (
                <p className="text-blue-50/90 text-sm sm:text-lg md:text-base max-w-2xl text-left">
                  {classData.description}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              {userRole === "teacher" && (
                <ClassDetailTeacherActions classData={classData} />
              )}

              <Link
                href={`/classes/${classData.id}/whiteboard`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-blue-600 px-5 py-3 font-semibold shadow-sm hover:bg-blue-50 transition-colors w-full sm:w-auto whitespace-nowrap"
              >
                <PenTool className="h-4 w-4" />
                Open Whiteboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
