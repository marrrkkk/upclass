"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Teachers Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-primary/80 border-b pb-2">Teachers</h2>
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No teachers assigned</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teachers.map((member) => {
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <Link key={member.id} href={`/home/user/${member.id}`} className="block h-full">
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer overflow-hidden">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={member.image || undefined} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">{initial}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-lg leading-tight">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-2xl font-semibold text-primary/80">Students</h2>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">{students.length} students</span>
        </div>
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/10 border-dashed">
            <div className="p-3 bg-background rounded-full shadow-sm mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No students enrolled yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {students.map((member) => {
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <Link key={member.id} href={`/home/user/${member.id}`} className="block group">
                  <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0 border-transparent hover:border-border/40">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={member.image || undefined} alt={member.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">{member.name}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

