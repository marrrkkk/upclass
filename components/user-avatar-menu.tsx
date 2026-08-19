"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Settings, User } from "lucide-react"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserAvatarMenuProps = {
  name: string | null
  email: string | null
  image: string | null
  userId?: string
}

export function UserAvatarMenu({ name, email, image, userId }: UserAvatarMenuProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    try {
      setPending(true)
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/")
            router.refresh()
          },
        },
      })
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-ring rounded-full"
          type="button"
          aria-label="Open account menu"
        >
          <EntityAvatar name={name || email || "User"} image={image} colorKey={userId} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
        <div className="flex items-center gap-3 p-2">
          <EntityAvatar name={name || email || "User"} image={image} colorKey={userId} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate type-small font-semibold text-foreground">{name || "UpClass user"}</p>
            {email ? <p className="truncate type-caption text-muted-foreground">{email}</p> : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href={userId ? organizationPath(`/user/${userId}`) : organizationPath("/profile")}
              className="cursor-pointer"
            >
              <User className="mr-2 size-4 text-muted-foreground" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={organizationPath("/settings")} className="cursor-pointer">
              <Settings className="mr-2 size-4 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={pending}
          className="cursor-pointer text-destructive focus:bg-destructive-surface focus:text-destructive-text"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          <span>{pending ? "Signing out…" : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
