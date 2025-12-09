"use client"

import { usePathname } from "next/navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { usePageHeader } from "@/components/page-header-context"

const routeTitles: Record<string, string> = {
  "/home": "Home",
  "/home/classes": "Classes",
  "/home/resources": "Resources",
  "/home/favorites": "Favorites",
  "/home/favorites/figma-basic": "Figma Basic",
  "/home/favorites/folder-new-2024": "Folder NEW 2024",
  "/home/favorites/assignment-101": "Assignment 101",
  "/home/settings": "Settings",
}

type PageHeaderProps = {
  user?: {
    name: string | null
    email: string | null
    image: string | null
  }
}

export function PageHeader({ user }: PageHeaderProps) {
  const pathname = usePathname()
  const title = routeTitles[pathname || "/home"] || "Home"
  const { rightSideContent } = usePageHeader()

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {rightSideContent}
        {user && (
          <UserAvatarMenu
            name={user.name}
            email={user.email}
            image={user.image}
          />
        )}
      </div>
    </div>
  )
}

