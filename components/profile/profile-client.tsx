"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, BookOpen, FolderOpen, Users, MessageSquare, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { buttonVariants } from "@/components/ui/button"

type UserData = {
  id: string
  name: string
  email: string | null
  image: string | null
  bio: string | null
  role: "teacher" | "student" | null
}

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  createdAt: string
  enrolledCount?: number
  role?: "teacher" | "student"
}

type ResourceData = {
  id: string
  title: string
  description: string | null
  category: string | null
  fileType: string
  createdAt: string
}

type ProfileClientProps = {
  user: UserData
  createdClasses: ClassData[]
  enrolledClasses: ClassData[]
  createdResources: ResourceData[]
  isOwnProfile?: boolean
  currentUserId?: string
  isPrivate?: boolean
}

export function ProfileClient({
  user,
  createdClasses,
  enrolledClasses,
  createdResources,
  isOwnProfile = false,
  currentUserId,
}: ProfileClientProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Show private profile message
  if (isPrivate && !isOwnProfile) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.image || undefined} alt={user.name} />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                  {user.name}
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </h1>
                <p className="text-muted-foreground">
                  This profile is private
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="bg-blue-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  {user.email && (
                    <p className="text-muted-foreground">{user.email}</p>
                  )}
                  {user.role && (
                    <span className="mt-2 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {user.role === "teacher" ? "Teacher" : "Student"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <EditProfileDialog user={user} />
                  ) : (
                    <Link
                      href={`/home/messages/${user.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Link>
                  )}
                </div>
              </div>
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-4">{user.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{createdClasses.length}</p>
                <p className="text-sm text-muted-foreground">Classes Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enrolledClasses.length}</p>
                <p className="text-sm text-muted-foreground">Classes Joined</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{createdResources.length}</p>
                <p className="text-sm text-muted-foreground">Resources Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Created Classes (Teachers only) */}
      {user.role === "teacher" && createdClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Classes Created</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {createdClasses.map((classItem) => {
              const classColor = classItem.color || "#3b82f6"
              return (
                <Link key={classItem.id} href={`/home/classes/${classItem.id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-md cursor-pointer">
                    <div
                      className="h-24"
                      style={{ backgroundColor: classColor }}
                    />
                    <CardHeader>
                      <CardTitle className="text-lg">{classItem.title}</CardTitle>
                      {classItem.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {classItem.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" style={{ color: classColor }} />
                          <span>{classItem.enrolledCount || 0} enrolled</span>
                        </div>
                        {classItem.category && (
                          <span
                            className="rounded-full border px-2 py-1 text-xs"
                            style={{
                              borderColor: `${classColor}40`,
                              backgroundColor: `${classColor}15`,
                              color: classColor,
                            }}
                          >
                            {classItem.category}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Enrolled Classes */}
      {enrolledClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Classes Joined</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enrolledClasses.map((classItem) => {
              const classColor = classItem.color || "#3b82f6"
              return (
                <Link key={classItem.id} href={`/home/classes/${classItem.id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-md cursor-pointer">
                    <div
                      className="h-24"
                      style={{ backgroundColor: classColor }}
                    />
                    <CardHeader>
                      <CardTitle className="text-lg">{classItem.title}</CardTitle>
                      {classItem.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {classItem.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span
                          className="rounded-full border px-2 py-1 text-xs"
                          style={{
                            borderColor: classItem.role === "teacher" ? `${classColor}40` : "#e5e7eb",
                            backgroundColor: classItem.role === "teacher" ? `${classColor}15` : "#f3f4f6",
                            color: classItem.role === "teacher" ? classColor : "#6b7280",
                          }}
                        >
                          {classItem.role === "teacher" ? "Teaching" : "Enrolled"}
                        </span>
                        {classItem.category && (
                          <span
                            className="rounded-full border px-2 py-1 text-xs"
                            style={{
                              borderColor: `${classColor}40`,
                              backgroundColor: `${classColor}15`,
                              color: classColor,
                            }}
                          >
                            {classItem.category}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Created Resources */}
      {createdResources.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Resources Created</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {createdResources.map((resource) => (
              <Card key={resource.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {resource.category && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                        {resource.category}
                      </span>
                    )}
                    <span className="text-xs uppercase">{resource.fileType}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty States */}
      {createdClasses.length === 0 && enrolledClasses.length === 0 && createdResources.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by {user.role === "teacher" ? "creating a class" : "joining a class"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

