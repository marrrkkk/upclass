"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  Download,
  FileIcon,
  FileSpreadsheet,
  FileText,
  FileType,
  FolderOpen,
  GraduationCap,
  Lock,
  Mail,
  MessageSquare,
  Presentation,
} from "lucide-react"

import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { ProfileCover } from "@/components/profile/profile-cover"
import { Button, buttonVariants } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { EntityRow } from "@/components/ui/entity-row"
import { IconBadge } from "@/components/ui/icon-badge"
import {
  Panel,
  PanelBody,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { PageHeading } from "@/components/ui/section"
import { StatGroup, StatTile } from "@/components/ui/stat-tile"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { cn } from "@/lib/utils"
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
  const organizationPath = useOrganizationPath()
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)

  React.useEffect(() => {
    setPageTitle(user.name)
    return () => setPageTitle(null)
  }, [setPageTitle, user.name])

  React.useEffect(() => {
    document.title = `${user.name} | UpClass`
  }, [user.name])

  if (isPrivate && !isOwnProfile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeading
          eyebrow="Profile"
          title={user.name}
          media={<EntityAvatar name={user.name} image={user.image} colorKey={user.id} size="xl" />}
        />
        <Panel padding="none">
          <EmptyState
            icon={<Lock />}
            title="Private profile"
            description="This profile is visible only to the account owner and approved contacts."
          />
        </Panel>
      </div>
    )
  }

  const classCount = createdClasses.length + enrolledClasses.length

  return (
    <>
      <Panel padding="none" className="overflow-hidden shadow-e1">
        <ProfileCover color={user.coverColor} image={user.cover} name={user.name} />
        <div className="flex flex-col gap-5 p-5 sm:-mt-10 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-end gap-4">
            <EntityAvatar
              name={user.name}
              image={user.image}
              colorKey={user.id}
              size="xl"
              className="size-24 shrink-0 border-4 border-card sm:size-28"
            />
            <div className="min-w-0 space-y-1.5 pb-1">
              <p className="type-overline text-muted-foreground">Profile</p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="type-h1 break-words">{user.name}</h1>
                {user.role ? (
                  <StatusBadge tone={user.role === "teacher" ? "info" : "neutral"} dot>
                    {user.role === "teacher" ? "Teacher" : "Student"}
                  </StatusBadge>
                ) : null}
              </div>
              {user.email ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              ) : null}
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {user.bio || "No biography shared."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:pb-1">
            {isOwnProfile ? (
              <EditProfileDialog user={user} />
            ) : (
              <Link
                href={organizationPath(`/messages/${user.id}`)}
                className={cn(buttonVariants({ size: "sm" }), "gap-2")}
              >
                <MessageSquare aria-hidden="true" className="size-4" />
                Message
              </Link>
            )}
          </div>
        </div>
      </Panel>

      <StatGroup columns={3} className="gap-2 sm:gap-3">
        <StatTile label="Teaching" value={createdClasses.length} tone="info" />
        <StatTile label="Enrolled" value={enrolledClasses.length} tone="primary" />
        <StatTile label="Shared resources" value={createdResources.length} tone="success" />
      </StatGroup>

      <Tabs defaultValue="classes" variant="line">
        <TabsList aria-label={`${user.name} profile sections`}>
          <TabsTrigger value="classes">
            <BookOpen aria-hidden="true" />
            Classes
            {classCount > 0 ? <span className="numeric-tabular">{classCount}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FolderOpen aria-hidden="true" />
            Resources
            {createdResources.length > 0 ? (
              <span className="numeric-tabular">{createdResources.length}</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-5">
          {user.role === "teacher" && createdClasses.length > 0 ? (
            <ClassList title="Teaching" classes={createdClasses} kind="created" />
          ) : null}
          {enrolledClasses.length > 0 ? (
            <ClassList title="Enrolled" classes={enrolledClasses} kind="enrolled" />
          ) : null}
          {classCount === 0 ? (
            <Panel padding="none">
              <EmptyState
                icon={<GraduationCap />}
                title="No visible classes"
                description={
                  isOwnProfile
                    ? "Classes you teach or join will appear here."
                    : "This person has no classes available to view."
                }
              />
            </Panel>
          ) : null}
        </TabsContent>

        <TabsContent value="resources">
          <Panel padding="none" className="overflow-hidden">
            {createdResources.length > 0 ? (
              <>
                <PanelHeader>
                  <PanelHeading>
                    <PanelTitle>Shared resources</PanelTitle>
                  </PanelHeading>
                </PanelHeader>
                <PanelBody className="minimal-scrollbar max-h-[32rem] divide-y divide-hairline overflow-y-auto p-0">
                  {createdResources.map((resource) => (
                    <ResourceRow key={resource.id} data={resource} />
                  ))}
                </PanelBody>
              </>
            ) : (
              <EmptyState
                icon={<FolderOpen />}
                title="No visible resources"
                description={
                  isOwnProfile
                    ? "Resources you share will appear here."
                    : "This person has no resources available to view."
                }
              />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  )
}

function ClassList({
  title,
  classes,
  kind,
}: {
  title: string
  classes: ClassData[]
  kind: "created" | "enrolled"
}) {
  const organizationPath = useOrganizationPath()

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle>{title}</PanelTitle>
        </PanelHeading>
      </PanelHeader>
      <PanelBody className="minimal-scrollbar max-h-[32rem] divide-y divide-hairline overflow-y-auto p-0">
        {classes.map((classItem) => {
          const enrolledCount = classItem.enrolledCount ?? 0
          const metadata =
            kind === "created"
              ? `${enrolledCount} ${enrolledCount === 1 ? "student" : "students"} enrolled`
              : classItem.teacherName
                ? `Teacher: ${classItem.teacherName}`
                : undefined

          return (
            <EntityRow
              key={classItem.id}
              href={organizationPath(`/classes/${classItem.id}`)}
              linkLabel={`Open ${classItem.title}`}
              media={
                <CourseSwatch
                  value={classItem.color}
                  courseKey={classItem.id}
                  label={`${classItem.title} course`}
                />
              }
              title={classItem.title}
              description={classItem.description || undefined}
              metadata={metadata}
              status={
                classItem.category ? (
                  <StatusBadge tone="neutral">{classItem.category}</StatusBadge>
                ) : undefined
              }
            />
          )
        })}
      </PanelBody>
    </Panel>
  )
}

function ResourceRow({ data }: { data: ResourceData }) {
  const organizationPath = useOrganizationPath()
  const fileInfo = getFileTypeInfo(data.fileType)
  const FileTypeIcon = fileInfo.icon
  const createdDate = formatDate(data.createdAt)
  const metadata = [createdDate, formatFileSize(data.fileSize)].filter(Boolean).join(" · ")

  return (
    <EntityRow
      href={organizationPath(`/resources/${data.id}`)}
      linkLabel={`Open ${data.title}`}
      media={
        <IconBadge tone={fileInfo.tone} size="md">
          <FileTypeIcon />
        </IconBadge>
      }
      title={data.title}
      description={data.description || data.fileName}
      metadata={metadata || undefined}
      status={<StatusBadge tone={fileInfo.tone}>{data.fileType.toUpperCase()}</StatusBadge>}
      actions={
        <Button asChild variant="ghost" size="icon-sm">
          <a
            href={data.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${data.title}`}
          >
            <Download aria-hidden="true" className="size-4" />
          </a>
        </Button>
      }
    />
  )
}

function getFileTypeInfo(type: string) {
  const normalized = type.toLowerCase()
  if (normalized === "pdf") return { icon: FileText, tone: "danger" as const }
  if (normalized === "doc" || normalized === "docx") {
    return { icon: FileText, tone: "info" as const }
  }
  if (["xls", "xlsx", "csv"].includes(normalized)) {
    return { icon: FileSpreadsheet, tone: "success" as const }
  }
  if (normalized === "ppt" || normalized === "pptx") {
    return { icon: Presentation, tone: "warning" as const }
  }
  if (normalized === "txt") return { icon: FileType, tone: "neutral" as const }
  return { icon: FileIcon, tone: "neutral" as const }
}

function formatDate(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  )
}

function formatFileSize(size: string | null) {
  if (!size) return ""
  const bytes = Number.parseInt(size, 10)
  if (!Number.isFinite(bytes) || bytes < 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
