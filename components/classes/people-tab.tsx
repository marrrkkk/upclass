"use client"

import { Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

type MemberData = {
  id: string
  name: string
  email: string
  image: string | null
  role: "teacher" | "student"
}

type PeopleTabProps = {
  members: MemberData[]
}

export function PeopleTab({ members }: PeopleTabProps) {
  const teachers = members.filter((m) => m.role === "teacher")
  const students = members.filter((m) => m.role === "student")

  return (
    <div className="flex flex-col gap-6">
      {/* Teachers Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Teachers</h2>
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teachers</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {teachers.map((member) => {
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={member.image || undefined} alt={member.name} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Teacher
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Students</h2>
          <span className="text-sm text-muted-foreground">{students.length} student{students.length === 1 ? "" : "s"}</span>
        </div>
        {students.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No students enrolled yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {students.map((member) => {
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={member.image || undefined} alt={member.name} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      Student
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

