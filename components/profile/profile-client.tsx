"use client"
import React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GraduationCap, BookOpen, FolderOpen, Users, MessageSquare, Lock, Calendar, Mail, User as UserIcon } from "lucide-react"
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
  isAuthenticated?: boolean
}

export function ProfileClient({
  user,
  createdClasses,
  enrolledClasses,
  createdResources,
  isOwnProfile = false,
  isPrivate = false,
  isAuthenticated = false,
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
      <div className="flex flex-col gap-6 max-w-4xl mx-auto items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Avatar className="h-32 w-32 border-4 border-muted">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 bg-background p-1.5 rounded-full border shadow-sm">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              This profile is private. You must be added to their contacts or they must change their privacy settings to be visible.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-10">
      {/* Profile Header Hero */}
      <div className="relative">
        {/* Cover Image Placeholder - could be a real image in the future */}
        <div className="h-48 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full mb-12 shadow-md" />

        <div className="absolute -bottom-6 left-6 md:left-10 flex items-end gap-6">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-background/50">
              <AvatarImage src={user.image || undefined} alt={user.name} className="object-cover" />
              <AvatarFallback className="bg-white text-primary text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="pb-8 hidden md:block text-white drop-shadow-md">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            {user.role && (
              <div className="flex items-center gap-2 mt-1 opacity-90">
                <span className="capitalize text-sm font-medium bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                  {user.role}
                </span>
                {user.email && isOwnProfile && (
                  <span className="text-sm font-light flex items-center gap-1">
                    • {user.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4 md:top-auto md:bottom-4 md:right-6">
          <div className="flex gap-3">
            {isOwnProfile ? (
              <EditProfileDialog user={user} />
            ) : (
              <Link
                href={`/home/messages/${user.id}`}
                className={cn(buttonVariants({ variant: "secondary" }), "shadow-lg gap-2")}
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Name Display */}
      <div className="md:hidden px-4 -mt-6 mb-4">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <div className="flex items-center gap-2 text-muted-foreground mt-1">
          <span className="capitalize text-sm font-medium bg-muted px-2 py-0.5 rounded">
            {user.role || 'User'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-1">
        {/* Left Column: Stats & Bio */}
        <div className="space-y-6">
          {/* Bio Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.bio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {user.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No bio provided.
                </p>
              )}

              <div className="pt-4 border-t space-y-3">
                {user.email && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date().getFullYear()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">
                  <GraduationCap className="h-6 w-6 mb-2 opacity-80" />
                  <span className="text-2xl font-bold">{createdClasses.length}</span>
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">Created</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
                  <BookOpen className="h-6 w-6 mb-2 opacity-80" />
                  <span className="text-2xl font-bold">{enrolledClasses.length}</span>
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">Joined</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 col-span-2">
                  <FolderOpen className="h-6 w-6 mb-2 opacity-80" />
                  <span className="text-2xl font-bold">{createdResources.length}</span>
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">Resources Shared</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="space-y-6">
              {/* Created Classes */}
              {user.role === "teacher" && createdClasses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    Created Classes
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {createdClasses.map((classItem) => (
                      <ClassCard key={classItem.id} data={classItem} type="created" />
                    ))}
                  </div>
                </div>
              )}

              {/* Joined Classes */}
              {enrolledClasses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    Enrolled Classes
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {enrolledClasses.map((classItem) => (
                      <ClassCard key={classItem.id} data={classItem} type="enrolled" />
                    ))}
                  </div>
                </div>
              )}

              {createdClasses.length === 0 && enrolledClasses.length === 0 && (
                <EmptyState
                  icon={GraduationCap}
                  title="No Classes Yet"
                  description={user.role === "teacher" ? "You haven't created or joined any classes yet." : "You haven't joined any classes yet."}
                />
              )}
            </TabsContent>

            <TabsContent value="resources" className="space-y-6">
              {createdResources.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-purple-500" />
                    Shared Resources
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {createdResources.map((resource) => (
                      <Card key={resource.id} className="group hover:shadow-md transition-all border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base truncate pr-2" title={resource.title}>
                              {resource.title}
                            </CardTitle>
                            <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                              {resource.fileType}
                            </Badge>
                          </div>
                          {resource.description && (
                            <CardDescription className="line-clamp-2 text-xs">
                              {resource.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{resource.category || "Uncategorized"}</span>
                            <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FolderOpen}
                  title="No Resources"
                  description="You haven't shared any resources yet."
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ClassCard({ data, type }: { data: ClassData, type: "created" | "enrolled" }) {
  const color = data.color || "#3b82f6"

  return (
    <Link href={`/home/classes/${data.id}`} className="block h-full">
      <Card className="h-full overflow-hidden hover:shadow-lg transition-all border-none shadow-sm ring-1 ring-border/50 group">
        <div
          className="h-24 relative"
          style={{ backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          {type === "created" && (
            <div className="absolute bottom-2 right-2 bg-black/20 text-white rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
              Teacher
            </div>
          )}
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
            {data.title}
          </CardTitle>
          {data.description && (
            <CardDescription className="line-clamp-2 text-xs h-10">
              {data.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {type === "created" ? `${data.enrolledCount || 0} students` : "Enrolled"}
            </span>
            {data.category && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {data.category}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl border-muted bg-muted/50">
      <div className="bg-background p-4 rounded-full shadow-sm mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mt-1">{description}</p>
    </div>
  )
}

