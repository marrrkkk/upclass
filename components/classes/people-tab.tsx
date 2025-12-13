"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, Trash2, MoreVertical, UserMinus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { removeMember } from "@/app/actions/class-detail"
import { MemberSkeleton } from "@/components/skeletons"

type MemberData = {
  id: string
  name: string
  email: string
  image: string | null
  role: "teacher" | "student"
}

type PeopleTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  members: MemberData[]
}

export function PeopleTab({ classId, userId, userRole, members }: PeopleTabProps) {
  const router = useRouter()
  const teachers = members.filter((m) => m.role === "teacher")
  const students = members.filter((m) => m.role === "student")

  const [removeMemberOpen, setRemoveMemberOpen] = useState<string | null>(null)
  const [removePending, startRemoveTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const memberToRemove = members.find(m => m.id === removeMemberOpen)

  const handleRemoveMember = (memberId: string) => {
    setRemovingId(memberId)
    setRemoveMemberOpen(null)
    startRemoveTransition(async () => {
      const res = await removeMember(classId, memberId)
      if (res.success) {
        router.refresh()
      }
      setRemovingId(null)
    })
  }

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
              if (removingId === member.id) return <MemberSkeleton key={member.id} />
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <Link key={member.id} href={`/user/${member.id}`} className="block h-full">
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
              if (removingId === member.id) return <MemberSkeleton key={member.id} />
              const initial = member.name.charAt(0).toUpperCase()
              return (
                <div key={member.id} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0 border-transparent hover:border-border/40">
                  <Link href={`/user/${member.id}`} className="flex-1 flex items-center gap-4 min-w-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={member.image || undefined} alt={member.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </Link>

                  {userRole === "teacher" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-full text-muted-foreground focus:outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRemoveMemberOpen(member.id)} className="text-destructive focus:text-destructive">
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove from class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={!!removeMemberOpen} onOpenChange={(open) => !open && setRemoveMemberOpen(null)}>
        <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Remove Student</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove this student from the class?
            </p>
            {memberToRemove && (
              <div className="flex items-center justify-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={memberToRemove.image || undefined} alt={memberToRemove.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground">{memberToRemove.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{memberToRemove.name}</p>
                  <p className="text-xs text-muted-foreground">{memberToRemove.email}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The student will no longer have access to this class.
            </p>
          </div>

          <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
            <button type="button" onClick={() => setRemoveMemberOpen(null)} disabled={removePending} className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}>
              Cancel
            </button>
            <button type="button" onClick={() => memberToRemove && handleRemoveMember(memberToRemove.id)} disabled={removePending} className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}>
              {removePending ? "Removing..." : (
                <>
                  <UserMinus className="h-4 w-4" />
                  Remove
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
