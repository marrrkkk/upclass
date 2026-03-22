"use client"
import React, { useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  GraduationCap,
  BookOpen,
  FolderOpen,
  Users,
  MessageSquare,
  Lock,
  Calendar,
  Mail,
  User as UserIcon,
  FileText,
  Download,
  FileSpreadsheet,
  Presentation,
  FileIcon as FileIconLucide,
  FileType,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { buttonVariants } from "@/components/ui/button"
import { usePageHeaderStore } from "@/stores/page-header-store"

type UserData = {
  id: string
  name: string
  email: string | null
  image: string | null
  cover: string | null
  coverColor: string | null
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
  teacherName?: string | null
  teacherImage?: string | null
}

type ResourceData = {
  id: string
  title: string
  description: string | null
  category: string | null
  fileType: string
  fileUrl: string
  fileName: string
  fileSize: string | null
  createdAt: string
  authorName?: string | null
  authorImage?: string | null
}

type ProfileClientProps = {
  user: UserData
  createdClasses: ClassData[]
  enrolledClasses: ClassData[]
  createdResources: ResourceData[]
  isOwnProfile?: boolean
  isPrivate?: boolean
}

export function ProfileClient({
  user,
  createdClasses,
  enrolledClasses,
  createdResources,
  isOwnProfile = false,
  isPrivate = false,
}: ProfileClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)

  useEffect(() => {
    setPageTitle(user.name)
    return () => setPageTitle(null)
  }, [user.name, setPageTitle])

  useEffect(() => {
    document.title = `${user.name} | UpClass`
  }, [user.name])

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const coverColor = user.coverColor || "#3b82f6"

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
    <div className="flex flex-col gap-4 max-w-6xl mx-auto pb-10">
      {/* Profile Header Hero - Redesigned */}
      <div className="relative">
        {/* Cover - Image or Color */}
        <div
          className="h-60 rounded-xl w-full shadow-sm relative overflow-hidden group"
          style={{ backgroundColor: coverColor }}
        >
          {user.cover && (
            <img
              src={user.cover}
              alt="Cover"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />

          {/* Gradient Overlay for texture/depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

          {/* Edit Cover Hint (only for owner) */}
          {isOwnProfile && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Badge variant="secondary" className="bg-black/20 hover:bg-black/40 text-white border-transparent backdrop-blur-md cursor-pointer pointer-events-none">
                Customize in Edit Profile
              </Badge>
            </div>
          )}
        </div>

        {/* Profile Info Bar */}
        <div className="relative flex flex-col md:flex-row items-center md:items-end px-4 md:px-10 -mt-16 md:-mt-20 gap-4 md:gap-6 z-10 w-full mb-2">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="rounded-full p-1.5 bg-background shadow-xl ring-1 ring-border/10">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background bg-background">
                <AvatarImage src={user.image || undefined} alt={user.name} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground text-4xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Name, Role & Actions */}
          <div className="flex-1 min-w-0 pt-2 pb-2 md:pb-6 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 w-full">
              <div className="space-y-2 flex flex-col items-center md:items-start">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-2 md:gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{user.name}</h1>
                  {user.role && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset mb-1",
                        user.role === "teacher"
                          ? "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400"
                      )}
                    >
                      {user.role === "teacher" ? <GraduationCap className="w-3 h-3 mr-1 opacity-70" /> : <Users className="w-3 h-3 mr-1 opacity-70" />}
                      <span className="capitalize">{user.role}</span>
                    </span>
                  )}
                </div>
                {user.email && (isOwnProfile || !isPrivate) && (
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 opacity-70" />
                    {user.email}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 shrink-0 mt-2 md:mt-0">
                {isOwnProfile ? (
                  <EditProfileDialog user={user} />
                ) : (
                  <Link
                    href={`/messages/${user.id}`}
                    className={cn(buttonVariants({ variant: "default", size: "sm" }), "shadow-md gap-2 h-9 px-6 bg-primary hover:bg-primary/90 rounded-full font-medium transition-all hover:scale-105 active:scale-95")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1">
        {/* Left Column: Bio & Stats */}
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
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {user.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No bio provided.
                </p>
              )}

              <div className="pt-4 border-t space-y-3">
                {/* Email is already shown in header if own profile, but good to keep here for consistency or public view */}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Created Classes</span>
                  </div>
                  <span className="text-lg font-bold">{createdClasses.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Joined Classes</span>
                  </div>
                  <span className="text-lg font-bold">{enrolledClasses.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Resources</span>
                  </div>
                  <span className="text-lg font-bold">{createdResources.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="classes" className="w-full">
            <div className="sticky top-16 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 mb-6 border-b">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="classes" className="text-sm">Classes</TabsTrigger>
                <TabsTrigger value="resources" className="text-sm">Resources</TabsTrigger>
              </TabsList>
            </div>

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
                      <ResourceCard key={resource.id} data={resource} />
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
  // Use explicit teacher data if available, otherwise fallback
  const teacherName = data.teacherName || "Unknown Teacher"
  const teacherImage = data.teacherImage

  const teacherInitials = teacherName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link href={`/classes/${data.id}`} className="group block h-full">
      <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
        {/* Banner with Pattern */}
        <div
          className="relative h-28 w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />

          {/* No Badges here as per user request */}

          {type === "created" && (
            <div
              className="absolute bottom-2 right-2 rounded-full bg-black/20 text-white px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
            >
              {data.enrolledCount || 0} students
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 pt-10 relative">
          {/* Avatar Floating Over Banner/Content */}
          <div className="absolute -top-7 left-5">
            <Avatar className="h-14 w-14 border-4 border-card shadow-sm">
              <AvatarImage src={teacherImage || undefined} alt={teacherName} />
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1.5 mb-4">
            <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {data.title}
            </h3>
            {data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-[2.5em]">
                {data.description}
              </p>
            )}
          </div>

          <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80 truncate max-w-[120px]">
                {teacherName}
              </span>
            </div>
            {data.category && (
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${color}10`,
                  color: color,
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
}

function ResourceCard({ data }: { data: ResourceData }) {
  const createdDate = data.createdAt
    ? new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(data.createdAt))
    : ""

  const fileInfo = getFileTypeInfo(data.fileType)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 h-full">
      <Link href={`/resources/${data.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {data.title}</span>
      </Link>

      {/* Card Header / Preview Area */}
      <div
        className={cn("relative h-32 flex items-center justify-center overflow-hidden transition-colors duration-300", fileInfo.bgColor)}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:16px_16px] [color:inherit]" />

        <div className={cn("relative z-10 transform transition-transform duration-300 group-hover:scale-110", fileInfo.textColor)}>
          <div className="p-4 rounded-xl bg-white/40 backdrop-blur-sm shadow-sm border border-white/30">
            <fileInfo.icon className="h-10 w-10" />
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-md bg-white/80 px-2 py-1 text-xs font-semibold uppercase tracking-wider shadow-sm text-foreground/80 backdrop-blur-sm">
            {data.fileType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
            {data.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-[2.5em]">
            {data.description || "No description provided."}
          </p>
        </div>

        <div className="mt-auto pt-4 border-t flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{createdDate}</span>
              {data.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(data.fileSize)}</span>
                </>
              )}
            </div>
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 p-2 -mr-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/10"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
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

// Helpers
const getFileTypeInfo = (type: string) => {
  const t = type.toLowerCase()
  if (t === 'pdf') return { icon: FileText, bgColor: 'bg-red-50', textColor: 'text-red-600' }
  if (t === 'doc' || t === 'docx') return { icon: FileText, bgColor: 'bg-blue-50', textColor: 'text-blue-600' }
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return { icon: FileSpreadsheet, bgColor: 'bg-green-50', textColor: 'text-green-600' }
  if (t === 'ppt' || t === 'pptx') return { icon: Presentation, bgColor: 'bg-orange-50', textColor: 'text-orange-600' }
  if (t === 'txt') return { icon: FileType, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
  return { icon: FileIconLucide, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
}

const formatFileSize = (size: string | null) => {
  if (!size) return ""
  const bytes = parseInt(size)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
